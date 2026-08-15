/**
 * 시험 service 의 화면 ↔ service 공유 타입
 */

import type { LangCode, QuizMode, QuizResult } from "@/lib/storage/_types";
import type { StudyRange } from "@/store/slice/uiSlice";

/** 「모른다」 보기는 항상 마지막(5번째) 자리에 둔다 */
export const UNKNOWN_CHOICE_INDEX = 4;

/** 아직 고르지 않은 문항 */
export const NO_ANSWER = -1;

/** 고를 수 있는 문제 수 */
export const QUIZ_COUNT_OPTIONS = [10, 20, 50, 100] as const;

/** 한 문항 */
export interface QuizQuestion {
  wordId: string;
  /** 외국어 단어 — 듣고 풀기 모드에서는 화면에 보여주지 않는다 */
  term: string;
  reading: string;
  example: string;
  exampleMeaning: string;
  /** TTS 발음 언어 */
  lang: LangCode;
  /** 보기 5개 — 앞 4개는 뜻, 마지막은 「모른다」 */
  choices: string[];
  /** 정답 보기의 자리 (0~3) */
  correctIndex: number;
}

/** 시험 한 판 */
export interface QuizSession {
  id: string;
  wordbookId: string | null;
  mode: QuizMode;
  startedAt: string;
  questions: QuizQuestion[];
}

/** 채점한 문항 하나 */
export interface QuizAnswerDetail {
  questionIndex: number;
  wordId: string;
  term: string;
  meaning: string;
  /** 사용자가 고른 자리 (NO_ANSWER 면 안 고름) */
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  isUnknown: boolean;
}

/** 채점 결과 */
export interface QuizSubmitResult {
  quizResult: QuizResult;
  totalCount: number;
  correctCount: number;
  wrongCount: number;
  unknownCount: number;
  /** 정답률 0~100 */
  percentage: number;
  details: QuizAnswerDetail[];
}

/** 시험을 만들 때 주는 값 */
export interface GenerateQuizInput {
  /** 특정 단어장으로 볼 때만 지정. 없으면 전체 단어에서 */
  wordbookId?: string;
  count: number;
  mode: QuizMode;
  /** 공부할 범위 — 없으면 전부에서 낸다(계획서 6-1) */
  studyRange?: StudyRange;
}
