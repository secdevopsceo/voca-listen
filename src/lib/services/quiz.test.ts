/**
 * 시험 규칙 테스트
 * 계획서 행위 11(채점)과 문제 만들기 규칙을 확인한다.
 * 무작위가 섞이는 부분은 rng 를 넣어 결과가 늘 같게 만든다(실행할 때마다 달라지지 않게).
 */

import * as quizResultStorage from "@/lib/storage/quiz-results";
import * as recordStorage from "@/lib/storage/word-records";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { generateQuiz, submitQuiz } from "./quiz";
import {
  NO_ANSWER,
  UNKNOWN_CHOICE_INDEX,
  type QuizSession,
} from "./quiz.types";
import { MAX_REVIEW_STAGE } from "./review";

/** 늘 같은 값을 주는 rng — 섞기 결과를 고정해 테스트가 흔들리지 않게 한다 */
const fixedRandom = () => 0.5;

function makeWordbook(name = "테스트", lang: "en" | "ja" | "fr" = "en") {
  return wordbookStorage.insertWordbook({
    deletedAt: null,
    name,
    lang,
    isDefault: false,
    sortOrder: 1,
  });
}

function addWords(wordbookId: string, count: number) {
  return wordStorage.insertWords(
    Array.from({ length: count }, (_, index) => ({
      deletedAt: null,
      wordbookId,
      term: `word${index}`,
      meaning: `뜻${index}`,
      reading: "",
      example: "",
      exampleMeaning: "",
      partOfSpeech: "",
      difficulty: 1,
      importance: 3,
      memo: "",
      starred: false,
    })),
  );
}

/** 예문과 예문 뜻까지 갖춘 단어 — 예문 듣고 풀기에 쓸 수 있는 단어 */
function addWordsWithExample(wordbookId: string, count: number) {
  return wordStorage.insertWords(
    Array.from({ length: count }, (_, index) => ({
      deletedAt: null,
      wordbookId,
      term: `term${index}`,
      meaning: `뜻${index}`,
      reading: "",
      example: `This is example ${index}.`,
      exampleMeaning: `이것은 ${index}번 예문이다.`,
      partOfSpeech: "",
      difficulty: 1,
      importance: 3,
      memo: "",
      starred: false,
    })),
  );
}

describe("generateQuiz", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("단어가 하나도 없으면 시험을 만들 수 없다", () => {
    const result = generateQuiz({ count: 10, mode: "see" }, fixedRandom);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("notEnoughWords");
  });

  it("고른 문제 수만큼 문항을 만든다", () => {
    const wordbook = makeWordbook();
    addWords(wordbook.id, 30);

    const result = generateQuiz({ count: 10, mode: "see" }, fixedRandom);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.questions).toHaveLength(10);
  });

  it("가진 단어가 문제 수보다 적으면 있는 만큼만 낸다", () => {
    const wordbook = makeWordbook();
    addWords(wordbook.id, 3);

    const result = generateQuiz({ count: 100, mode: "see" }, fixedRandom);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.questions).toHaveLength(3);
  });

  it("보기에 정답이 반드시 들어 있고, 정답 자리가 맞다", () => {
    const wordbook = makeWordbook();
    const words = addWords(wordbook.id, 20);
    const meaningById = new Map(words.map((word) => [word.id, word.meaning]));

    const result = generateQuiz({ count: 10, mode: "see" }, fixedRandom);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const question of result.data.questions) {
      const answer = meaningById.get(question.wordId);
      expect(question.choices[question.correctIndex]).toBe(answer);
    }
  });

  it("보기에 같은 뜻이 두 번 나오지 않는다", () => {
    const wordbook = makeWordbook();
    addWords(wordbook.id, 20);

    const result = generateQuiz({ count: 10, mode: "see" }, fixedRandom);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const question of result.data.questions) {
      expect(new Set(question.choices).size).toBe(question.choices.length);
    }
  });

  it("🚨 단어가 5개보다 적어도 시험을 만들 수 있다(보기만 줄어든다)", () => {
    const wordbook = makeWordbook();
    addWords(wordbook.id, 2);

    const result = generateQuiz({ count: 10, mode: "see" }, fixedRandom);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.questions).toHaveLength(2);
    for (const question of result.data.questions) {
      expect(question.choices.length).toBeGreaterThanOrEqual(1);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it("오답 보기는 언어를 가리지 않고 전체 단어에서 가져온다", () => {
    const english = makeWordbook("영어", "en");
    const japanese = makeWordbook("일본어", "ja");
    wordStorage.insertWord({
      deletedAt: null,
      wordbookId: japanese.id,
      term: "ねこ",
      meaning: "고양이",
      reading: "",
      example: "",
      exampleMeaning: "",
      partOfSpeech: "",
      difficulty: 1,
      importance: 3,
      memo: "",
      starred: false,
    });
    wordStorage.insertWord({
      deletedAt: null,
      wordbookId: english.id,
      term: "dog",
      meaning: "개",
      reading: "",
      example: "",
      exampleMeaning: "",
      partOfSpeech: "",
      difficulty: 1,
      importance: 3,
      memo: "",
      starred: false,
    });

    // 영어 단어장만 골라도 일본어 단어의 뜻이 보기로 올라온다
    const result = generateQuiz(
      { wordbookId: english.id, count: 1, mode: "see" },
      fixedRandom,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.questions[0].choices).toContain("고양이");
  });

  it("문항에 그 단어장의 언어가 담긴다(발음에 쓰인다)", () => {
    const japanese = makeWordbook("일본어", "ja");
    addWords(japanese.id, 3);

    const result = generateQuiz({ count: 3, mode: "listen" }, fixedRandom);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.questions.every((question) => question.lang === "ja")).toBe(true);
  });

  it("휴지통에 있는 단어는 문제로 나오지 않는다", () => {
    const wordbook = makeWordbook();
    const words = addWords(wordbook.id, 5);
    wordStorage.updateWord(words[0].id, { deletedAt: "2026-03-01T00:00:00.000Z" });

    const result = generateQuiz({ count: 10, mode: "see" }, fixedRandom);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.questions).toHaveLength(4);
    expect(result.data.questions.some((q) => q.wordId === words[0].id)).toBe(false);
  });

  it("예문 듣고 풀기는 예문 뜻으로 보기를 만든다", () => {
    const book = makeWordbook();
    addWordsWithExample(book.id, 6);

    const result = generateQuiz({ count: 3, mode: "example" }, fixedRandom);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const meanings = wordStorage.selectListWords().map((word) => word.meaning);
    for (const question of result.data.questions) {
      // 정답은 그 단어의 예문 뜻이다
      expect(question.choices[question.correctIndex]).toBe(question.exampleMeaning);
      // 보기에 단어 뜻(짧은 뜻)이 섞이지 않는다
      for (const choice of question.choices) {
        expect(meanings).not.toContain(choice);
      }
    }
  });

  it("예문이 없는 단어는 예문 듣고 풀기 문제로 나오지 않는다", () => {
    const book = makeWordbook();
    addWordsWithExample(book.id, 4);
    addWords(book.id, 10); // 예문 없는 단어

    const result = generateQuiz({ count: 10, mode: "example" }, fixedRandom);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 예문 있는 4개만 나온다
    expect(result.data.questions).toHaveLength(4);
    for (const question of result.data.questions) {
      expect(question.example).not.toBe("");
      expect(question.exampleMeaning).not.toBe("");
    }
  });

  it("예문 있는 단어가 하나도 없으면 예문 듣고 풀기를 만들 수 없다", () => {
    const book = makeWordbook();
    addWords(book.id, 10);

    const result = generateQuiz({ count: 5, mode: "example" }, fixedRandom);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("notEnoughWords");
  });
});

describe("submitQuiz", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function makeSession(): QuizSession {
    const wordbook = makeWordbook();
    addWords(wordbook.id, 10);
    const result = generateQuiz({ count: 4, mode: "see" }, fixedRandom);
    if (!result.ok) throw new Error("setup failed");
    return result.data;
  }

  it("맞은 개수와 정답률을 센다", () => {
    const session = makeSession();
    const answers = session.questions.map((question, index) =>
      // 앞 두 문제만 맞힌다
      index < 2 ? question.correctIndex : (question.correctIndex + 1) % 4,
    );

    const result = submitQuiz(session, answers);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.totalCount).toBe(4);
    expect(result.data.correctCount).toBe(2);
    expect(result.data.wrongCount).toBe(2);
    expect(result.data.percentage).toBe(50);
  });

  it("🚨 「모른다」는 오답으로 센다", () => {
    const session = makeSession();
    const answers = session.questions.map(() => UNKNOWN_CHOICE_INDEX);

    const result = submitQuiz(session, answers);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.correctCount).toBe(0);
    expect(result.data.wrongCount).toBe(4);
    expect(result.data.unknownCount).toBe(4);
    expect(result.data.percentage).toBe(0);
  });

  it("「모른다」를 고르면 복습 단계가 1 로 돌아간다", () => {
    const session = makeSession();
    const wordId = session.questions[0].wordId;
    recordStorage.insertWordRecord({
      deletedAt: null,
      wordId,
      correctCount: 4,
      wrongCount: 0,
      unknownCount: 0,
      lastTestedAt: "2026-03-01T00:00:00.000Z",
      reviewStage: 4,
      nextReviewAt: "2026-03-15T00:00:00.000Z",
    });

    submitQuiz(
      session,
      session.questions.map((_, index) => (index === 0 ? UNKNOWN_CHOICE_INDEX : NO_ANSWER)),
    );

    const record = recordStorage.selectWordRecord(wordId);
    expect(record?.reviewStage).toBe(1);
    expect(record?.wrongCount).toBe(1);
    expect(record?.unknownCount).toBe(1);
  });

  it("학습 기록이 없던 단어는 새로 만들어진다", () => {
    const session = makeSession();
    const answers = session.questions.map((question) => question.correctIndex);

    submitQuiz(session, answers);

    for (const question of session.questions) {
      const record = recordStorage.selectWordRecord(question.wordId);
      expect(record).not.toBeNull();
      expect(record?.correctCount).toBe(1);
      expect(record?.reviewStage).toBe(1);
    }
  });

  it("이미 있던 학습 기록은 값이 더해지고 단계가 오른다", () => {
    const session = makeSession();
    const wordId = session.questions[0].wordId;
    recordStorage.insertWordRecord({
      deletedAt: null,
      wordId,
      correctCount: 2,
      wrongCount: 1,
      unknownCount: 0,
      lastTestedAt: "2026-03-01T00:00:00.000Z",
      reviewStage: 2,
      nextReviewAt: "2026-03-04T00:00:00.000Z",
    });

    submitQuiz(
      session,
      session.questions.map((question, index) =>
        index === 0 ? question.correctIndex : NO_ANSWER,
      ),
    );

    const record = recordStorage.selectWordRecord(wordId);
    expect(record?.correctCount).toBe(3);
    expect(record?.wrongCount).toBe(1);
    expect(record?.reviewStage).toBe(3);
  });

  it("가장 높은 단계에서 또 맞혀도 그 위로는 오르지 않는다", () => {
    const session = makeSession();
    const wordId = session.questions[0].wordId;
    recordStorage.insertWordRecord({
      deletedAt: null,
      wordId,
      correctCount: 9,
      wrongCount: 0,
      unknownCount: 0,
      lastTestedAt: "2026-03-01T00:00:00.000Z",
      reviewStage: MAX_REVIEW_STAGE,
      nextReviewAt: "2026-04-01T00:00:00.000Z",
    });

    submitQuiz(
      session,
      session.questions.map((question, index) =>
        index === 0 ? question.correctIndex : NO_ANSWER,
      ),
    );

    expect(recordStorage.selectWordRecord(wordId)?.reviewStage).toBe(MAX_REVIEW_STAGE);
  });

  it("시험 기록이 1행 남는다", () => {
    const session = makeSession();
    const answers = session.questions.map((question) => question.correctIndex);

    submitQuiz(session, answers);

    const results = quizResultStorage.selectListQuizResults();
    expect(results).toHaveLength(1);
    expect(results[0].totalCount).toBe(4);
    expect(results[0].correctCount).toBe(4);
    expect(results[0].mode).toBe("see");
  });

  it("🚨 한 문제도 풀지 않으면 아무것도 저장하지 않는다", () => {
    const session = makeSession();

    const result = submitQuiz(
      session,
      session.questions.map(() => NO_ANSWER),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("noAnswers");
    expect(quizResultStorage.selectListQuizResults()).toHaveLength(0);
    expect(recordStorage.selectListWordRecords()).toHaveLength(0);
  });

  it("건너뛴 문제는 채점 대상에서 뺀다", () => {
    const session = makeSession();
    const answers = session.questions.map((question, index) =>
      index < 2 ? question.correctIndex : NO_ANSWER,
    );

    const result = submitQuiz(session, answers);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.totalCount).toBe(2);
    expect(result.data.percentage).toBe(100);
    // 건너뛴 단어에는 기록이 생기지 않는다
    expect(recordStorage.selectListWordRecords()).toHaveLength(2);
  });
});
