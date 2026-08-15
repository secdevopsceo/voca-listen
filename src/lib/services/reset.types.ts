/**
 * 초기화 service 의 화면 ↔ service 공유 타입
 */

/** 점수만 지우기의 결과 — 무엇이 얼마나 지워졌는지 화면에 알려준다 */
export interface ResetScoresResult {
  /** 지운 시험 기록 수 */
  deletedQuizResultCount: number;
  /** 지운 학습 기록 수 */
  deletedWordRecordCount: number;
  /** 별표가 풀린 단어 수 */
  unstarredWordCount: number;
  /** 그대로 남은 단어 수 — "단어는 안 지운다" 를 화면에서 확인시켜 주는 값 */
  keptWordCount: number;
  /** 그대로 남은 단어장 수 */
  keptWordbookCount: number;
}
