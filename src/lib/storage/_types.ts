/**
 * 저장 항목 타입 정의
 * 계획서 "저장 데이터 구조" 의 6개 항목을 그대로 옮긴 것.
 * 모든 시각은 UTC ISO 8601 문자열(default-rules.md 제3장 "DB 시간대 = UTC+0").
 * 컬럼 순서는 id → createdAt → updatedAt → deletedAt → 나머지
 * (제3장 "신규 테이블 컬럼 순서" 준용).
 */

/** 단어장이 다루는 언어 — TTS 발음 언어가 된다. */
export type LangCode = "en" | "ja" | "fr";

/** 단어장 */
export interface Wordbook {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** 휴지통에 넣은 시각. null 이면 사용 중 */
  deletedAt: string | null;
  name: string;
  lang: LangCode;
  /** 기본 단어장(글로비시 품사별). true 면 삭제할 수 없다 */
  isDefault: boolean;
  /**
   * 목록에 늘어놓는 순서. 작을수록 왼쪽.
   * 글로비시 품사 단어장은 1~10(문법책 순서), 사용자가 만들면 지금 있는 값 중
   * 가장 작은 값보다 1 작은 값을 받아 **항상 맨 왼쪽**에 온다.
   */
  sortOrder: number;
}

/** 단어 */
export interface Word {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  wordbookId: string;
  /** 외국어 단어 (필수) */
  term: string;
  /** 한국어 뜻 (필수) */
  meaning: string;
  /** 발음 표기 — 일본어 가나·로마자, 프랑스어 발음 */
  reading: string;
  example: string;
  exampleMeaning: string;
  partOfSpeech: string;
  /** 난이도 1~5 — 한국 사람이 뜻을 떠올리기 어려운 정도(클수록 어렵다) */
  difficulty: number;
  /** 중요도 1~5 — 영어에서 자주 쓰이는 정도(클수록 자주 쓴다) */
  importance: number;
  /** 자유 메모 — 시험에 나오지 않는다 */
  memo: string;
  starred: boolean;
}

/** 단어별 학습 기록 */
export interface WordRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  wordId: string;
  correctCount: number;
  wrongCount: number;
  /** 「모른다」를 고른 횟수 — 통계 표시용(오답 수에도 함께 반영된다) */
  unknownCount: number;
  lastTestedAt: string | null;
  /** 복습 단계 0~5 — 계획서 망각곡선 규칙 */
  reviewStage: number;
  nextReviewAt: string | null;
}

/**
 * 시험 모드
 * see: 눈으로 풀기 / listen: 단어를 듣고 뜻 고르기 / example: 예문을 듣고 문장 뜻 고르기
 */
export type QuizMode = "see" | "listen" | "example";

/** 시험 1회 기록 */
export interface QuizResult {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** 특정 단어장으로 시험을 봤으면 그 id, 전체 대상이면 null */
  wordbookId: string | null;
  mode: QuizMode;
  totalCount: number;
  correctCount: number;
  wrongCount: number;
  unknownCount: number;
  finishedAt: string;
}

/**
 * TTS 가 읽는 범위 — 네 단계로 늘어난다.
 * term(단어만) → term_meaning(+뜻) → term_meaning_example(+예문) → ..._example_meaning(+예문 뜻)
 */
export type TtsReadScope =
  | "term"
  | "term_meaning"
  | "term_meaning_example"
  | "term_meaning_example_meaning";
export type TtsGender = "female" | "male";
export type UiLocale = "ko" | "en";
export type ThemeMode = "light" | "dark" | "system";

/** 설정 (1행) */
export interface Settings {
  id: number;
  createdAt: string;
  updatedAt: string;
  /** 읽기 속도 0.5 ~ 2 */
  ttsRate: number;
  ttsGender: TtsGender;
  ttsReadScope: TtsReadScope;
  /** 자동 재생 시 각 항목 반복 횟수 */
  ttsRepeat: number;
  /** 자동 재생 시 항목 사이 간격(밀리초) */
  ttsGapMs: number;
  uiLocale: UiLocale;
  theme: ThemeMode;
  /**
   * 공부할 범위 기본값 — 듣기·시험·단어장 목록이 이 값을 처음 값으로 쓴다.
   * 각 화면에서 임시로 바꿀 수 있고, 그 임시 값은 저장하지 않는다.
   */
  studyImportanceMin: number;
  studyImportanceMax: number;
  studyDifficultyMin: number;
  studyDifficultyMax: number;
}

/** 앱 메타 (1행) — 시드를 다시 넣지 않기 위한 표시 */
export interface AppMeta {
  id: number;
  createdAt: string;
  updatedAt: string;
  seedVersion: number;
  seededAt: string | null;
}
