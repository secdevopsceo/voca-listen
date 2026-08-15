/**
 * 단어 service 의 화면 ↔ service 공유 타입
 */

import type { LangCode, Word, WordRecord } from "@/lib/storage/_types";

/** 화면 목록에 쓰는 단어 — 학습 기록 요약을 함께 담는다 */
export interface WordView extends Word {
  /** 이 단어가 속한 단어장 이름 */
  wordbookName: string;
  /** 이 단어장의 언어 — TTS 발음 언어 */
  wordbookLang: LangCode;
  correctCount: number;
  wrongCount: number;
  /** 정답률 0~100 */
  accuracy: number;
  reviewStage: number;
  nextReviewAt: string | null;
  lastTestedAt: string | null;
}

/**
 * 단어를 추가한 결과.
 * 같은 단어가 이미 있으면 바로 넣지 않고 duplicated 로 돌려주어,
 * 화면이 「뜻 고치기 / 새로 추가」를 묻게 한다(계획서 행위 5 의 분기).
 */
export type AddWordOutcome =
  | { kind: "created"; word: Word }
  | { kind: "updated"; word: Word }
  | { kind: "duplicated"; existing: Word };

/** 같은 단어를 만났을 때 사용자가 고른 것 */
export type DuplicateAction = "edit" | "addNew";

/** 휴지통을 비운 결과 */
export interface EmptyTrashResult {
  deletedWordCount: number;
  deletedWordbookCount: number;
  deletedRecordCount: number;
}

/** 학습 기록을 곁들인 단어 (내부 조합용) */
export interface WordWithRecord {
  word: Word;
  record: WordRecord | null;
}
