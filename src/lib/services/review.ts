/**
 * 망각곡선 복습 규칙 (순수 계산)
 *
 * 계획서 "저장 데이터 구조" 의 규칙 그대로:
 * 맞히면 단계를 1 올리고, 틀리거나 「모른다」를 고르면 단계를 1 로 되돌린다.
 * 단계별 다음 복습까지의 날 수는 아래 표를 따른다.
 */

import type { WordRecord } from "@/lib/storage/_types";

/** 단계별 다음 복습까지의 날 수. 배열 순서 = 단계 번호(0 은 아직 안 본 상태) */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const;

/** 가장 높은 복습 단계 — 여기 도달하면 "다 외움" 으로 본다 */
export const MAX_REVIEW_STAGE = REVIEW_INTERVAL_DAYS.length - 1;

/** 맞혔을 때 오르고 틀리면 1 로 돌아가는 다음 단계 */
export function calcNextStage(currentStage: number, isCorrect: boolean): number {
  if (!isCorrect) return 1;
  const next = currentStage + 1;
  return next > MAX_REVIEW_STAGE ? MAX_REVIEW_STAGE : next;
}

/** 그 단계의 다음 복습 시각 (UTC ISO 8601) */
export function calcNextReviewAt(stage: number, fromIso: string): string {
  const safeStage = Math.min(Math.max(stage, 0), MAX_REVIEW_STAGE);
  const days = REVIEW_INTERVAL_DAYS[safeStage];
  const base = new Date(fromIso).getTime();
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

/** 지금 복습할 때가 된 기록인지 */
export function isDueForReview(record: WordRecord, nowIso: string): boolean {
  if (record.nextReviewAt === null) return true;
  return record.nextReviewAt <= nowIso;
}

/** 다 외운 것으로 볼지 (통계의 "마스터한 단어") */
export function isMastered(record: WordRecord): boolean {
  return record.reviewStage >= MAX_REVIEW_STAGE;
}

/** 정답률 0~100 — 아직 한 번도 안 봤으면 0 */
export function calcAccuracy(record: Pick<WordRecord, "correctCount" | "wrongCount">): number {
  const total = record.correctCount + record.wrongCount;
  if (total === 0) return 0;
  return Math.round((record.correctCount / total) * 100);
}
