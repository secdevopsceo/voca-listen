/**
 * 시험 규칙 계산
 * 계획서 데이터 변화 행위 11(시험 제출) 담당 + 문제 만들기.
 *
 * 출제 우선순위: ① 오늘 복습할 단어 → ② 틀린 횟수가 많은 단어 → ③ 나머지 무작위
 * 오답 보기는 언어를 가리지 않고 전체 단어의 뜻에서 가져온다(계획서 확정 사항).
 */

import { createId, nowIso, runInTransaction } from "@/lib/storage/_client";
import type { LangCode, Word } from "@/lib/storage/_types";
import * as quizResultStorage from "@/lib/storage/quiz-results";
import * as recordStorage from "@/lib/storage/word-records";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { filterByStudyRange } from "@/lib/study-range";
import { fail, ok, type ServiceResult } from "./_result";
import { calcNextReviewAt, calcNextStage, isDueForReview } from "./review";
import {
  NO_ANSWER,
  UNKNOWN_CHOICE_INDEX,
  type GenerateQuizInput,
  type QuizAnswerDetail,
  type QuizQuestion,
  type QuizSession,
  type QuizSubmitResult,
} from "./quiz.types";

/**
 * 한 문항의 뜻 보기 수(정답 1 + 오답 3).
 * 화면이 여기에 「모른다」를 마지막 자리로 더해 5지선다가 된다.
 */
const MEANING_CHOICE_COUNT = 4;

/** 0 이상 1 미만의 수를 주는 함수 — 테스트에서 결정적으로 만들려고 주입할 수 있게 한다 */
export type RandomFn = () => number;

const defaultRandom: RandomFn = () => Math.random();

/** Fisher-Yates 섞기 (원본을 건드리지 않는다) */
function shuffle<T>(items: T[], random: RandomFn): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * 시험 만들기
 * 단어가 하나도 없으면 시험을 만들 수 없다.
 */
export function generateQuiz(
  input: GenerateQuizInput,
  random: RandomFn = defaultRandom,
): ServiceResult<QuizSession> {
  const all = wordStorage.selectListWords(
    input.wordbookId === undefined ? {} : { wordbookId: input.wordbookId },
  );
  // 공부할 범위 밖 단어는 문제로 내지 않는다(계획서 6-1)
  const inRange =
    input.studyRange === undefined ? all : filterByStudyRange(all, input.studyRange);

  /**
   * 예문 듣고 풀기는 **예문과 예문 뜻이 모두 있는 단어**만 낼 수 있다.
   * 하나라도 비면 읽어줄 것도, 고를 답도 없다.
   */
  const isExampleMode = input.mode === "example";
  const candidates = isExampleMode ? inRange.filter(hasUsableExample) : inRange;
  if (candidates.length === 0) return fail("notEnoughWords");

  const picked = pickWords(candidates, input.count, random);

  // 오답 보기는 언어를 가리지 않고 전체 단어에서 가져온다.
  // 예문 듣고 풀기면 「예문 뜻」끼리, 그 밖에는 「단어 뜻」끼리 섞는다.
  const answerPool = unique(
    wordStorage
      .selectListWords()
      .map((word) => answerTextOf(word, isExampleMode))
      .filter((text) => text.trim() !== ""),
  );

  // 단어장 언어를 한 번만 읽어 문항마다 나눠 쓴다
  const langMap = new Map<string, LangCode>(
    wordbookStorage
      .selectListWordbooks({ includeDeleted: true })
      .map((wordbook) => [wordbook.id, wordbook.lang]),
  );

  const questions = picked.map((word) =>
    buildQuestion(
      word,
      answerTextOf(word, isExampleMode),
      answerPool,
      langMap.get(word.wordbookId) ?? "en",
      random,
    ),
  );

  return ok({
    id: createId(),
    wordbookId: input.wordbookId ?? null,
    mode: input.mode,
    startedAt: nowIso(),
    questions,
  });
}

/** 출제 우선순위대로 단어를 고른다 */
function pickWords(candidates: Word[], count: number, random: RandomFn): Word[] {
  const now = nowIso();
  const records = recordStorage.selectListWordRecordsByWordIds(
    candidates.map((word) => word.id),
  );
  const recordMap = new Map(records.map((record) => [record.wordId, record]));

  const due: Word[] = [];
  const wrongHeavy: Word[] = [];
  const rest: Word[] = [];

  for (const word of candidates) {
    const record = recordMap.get(word.id);
    if (record !== undefined && isDueForReview(record, now)) {
      due.push(word);
    } else if (record !== undefined && record.wrongCount > record.correctCount) {
      wrongHeavy.push(word);
    } else {
      rest.push(word);
    }
  }

  // 틀린 횟수가 많은 순으로
  wrongHeavy.sort((a, b) => {
    const wrongA = recordMap.get(a.id)?.wrongCount ?? 0;
    const wrongB = recordMap.get(b.id)?.wrongCount ?? 0;
    return wrongB - wrongA;
  });

  const ordered = [...shuffle(due, random), ...wrongHeavy, ...shuffle(rest, random)];
  const limit = Math.min(count, ordered.length);
  // 문제가 나오는 순서 자체도 섞어서 낸다
  return shuffle(ordered.slice(0, limit), random);
}

/**
 * 한 문항을 만든다.
 * 오답이 모자라면(전체 단어가 아주 적을 때) 있는 만큼만 넣는다 — 그래도 시험은 볼 수 있다.
 */
function buildQuestion(
  word: Word,
  answer: string,
  answerPool: string[],
  lang: LangCode,
  random: RandomFn,
): QuizQuestion {
  const wrongPool = answerPool.filter((text) => text !== answer);
  const wrongChoices = shuffle(wrongPool, random).slice(0, MEANING_CHOICE_COUNT - 1);
  const choices = shuffle([answer, ...wrongChoices], random);

  return {
    wordId: word.id,
    term: word.term,
    reading: word.reading,
    example: word.example,
    exampleMeaning: word.exampleMeaning,
    lang,
    choices,
    correctIndex: choices.indexOf(answer),
  };
}

/** 이 문제의 정답 글자 — 예문 듣고 풀기면 예문 뜻, 아니면 단어 뜻 */
function answerTextOf(word: Word, isExampleMode: boolean): string {
  return isExampleMode ? word.exampleMeaning : word.meaning;
}

/** 예문 듣고 풀기에 쓸 수 있는 단어인가 */
function hasUsableExample(word: Word): boolean {
  return word.example.trim() !== "" && word.exampleMeaning.trim() !== "";
}

/**
 * 행위 11 — 시험 제출 (채점)
 *
 * 1) 단어별 학습 기록을 새로 만들거나 고치고(맞힌/틀린/모른다 횟수·복습 단계·다음 복습일),
 * 2) 시험 기록 1행을 추가한다.
 * 「모른다」는 오답으로 센다(찍기 방지).
 * 한 문제도 풀지 않았으면 아무것도 저장하지 않는다.
 */
export function submitQuiz(
  session: QuizSession,
  answers: number[],
): ServiceResult<QuizSubmitResult> {
  const details: QuizAnswerDetail[] = session.questions.map((question, index) => {
    const selectedIndex = answers[index] ?? NO_ANSWER;
    const isUnknown = selectedIndex === UNKNOWN_CHOICE_INDEX;
    const isCorrect = !isUnknown && selectedIndex === question.correctIndex;
    return {
      questionIndex: index,
      wordId: question.wordId,
      term: question.term,
      meaning: question.choices[question.correctIndex],
      selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect,
      isUnknown,
    };
  });

  // 안 고르고 넘긴 문항은 채점 대상에서 뺀다
  const graded = details.filter((detail) => detail.selectedIndex !== NO_ANSWER);
  if (graded.length === 0) return fail("noAnswers");

  const correctCount = graded.filter((detail) => detail.isCorrect).length;
  const unknownCount = graded.filter((detail) => detail.isUnknown).length;
  const wrongCount = graded.length - correctCount;

  const quizResult = runInTransaction(() => {
    const finishedAt = nowIso();

    for (const detail of graded) {
      applyRecord(detail.wordId, detail.isCorrect, detail.isUnknown, finishedAt);
    }

    return quizResultStorage.insertQuizResult({
      deletedAt: null,
      wordbookId: session.wordbookId,
      mode: session.mode,
      totalCount: graded.length,
      correctCount,
      wrongCount,
      unknownCount,
      finishedAt,
    });
  });

  return ok({
    quizResult,
    totalCount: graded.length,
    correctCount,
    wrongCount,
    unknownCount,
    percentage: Math.round((correctCount / graded.length) * 100),
    details,
  });
}

/** 단어 1개의 학습 기록을 채점 결과대로 만들거나 고친다 */
function applyRecord(
  wordId: string,
  isCorrect: boolean,
  isUnknown: boolean,
  testedAt: string,
): void {
  const current = recordStorage.selectWordRecord(wordId);

  if (current === null) {
    const reviewStage = calcNextStage(0, isCorrect);
    recordStorage.insertWordRecord({
      deletedAt: null,
      wordId,
      correctCount: isCorrect ? 1 : 0,
      wrongCount: isCorrect ? 0 : 1,
      unknownCount: isUnknown ? 1 : 0,
      lastTestedAt: testedAt,
      reviewStage,
      nextReviewAt: calcNextReviewAt(reviewStage, testedAt),
    });
    return;
  }

  const reviewStage = calcNextStage(current.reviewStage, isCorrect);
  recordStorage.updateWordRecord(wordId, {
    correctCount: current.correctCount + (isCorrect ? 1 : 0),
    wrongCount: current.wrongCount + (isCorrect ? 0 : 1),
    unknownCount: current.unknownCount + (isUnknown ? 1 : 0),
    lastTestedAt: testedAt,
    reviewStage,
    nextReviewAt: calcNextReviewAt(reviewStage, testedAt),
  });
}
