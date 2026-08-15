/**
 * 시험 기록 저장소
 * 함수명 prefix 는 select / selectList / insert / update / delete 5종만 쓴다.
 */

import { createId, nowIso, readJson, writeJson } from "./_client";
import { STORAGE_KEYS } from "./_keys";
import type { QuizResult } from "./_types";

export type NewQuizResult = Omit<QuizResult, "id" | "createdAt" | "updatedAt">;

function readAll(): QuizResult[] {
  return readJson<QuizResult[]>(STORAGE_KEYS.quizResults, []);
}

function writeAll(rows: QuizResult[]): void {
  writeJson(STORAGE_KEYS.quizResults, rows);
}

/** 시험 기록 목록 — 최근 것이 앞에 온다 */
export function selectListQuizResults(limit?: number): QuizResult[] {
  const rows = [...readAll()].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  return limit === undefined ? rows : rows.slice(0, limit);
}

/** 시험 기록 1개 */
export function selectQuizResult(id: string): QuizResult | null {
  return readAll().find((row) => row.id === id) ?? null;
}

/** 시험 본 횟수 */
export function selectQuizResultCount(): number {
  return readAll().length;
}

/** 새 시험 기록 추가 */
export function insertQuizResult(input: NewQuizResult): QuizResult {
  const now = nowIso();
  const row: QuizResult = { id: createId(), createdAt: now, updatedAt: now, ...input };
  writeAll([...readAll(), row]);
  return row;
}

/** 시험 기록 전부 삭제 — 초기화(점수만 지우기)에서 쓴다 */
export function deleteAllQuizResults(): number {
  const count = readAll().length;
  writeAll([]);
  return count;
}

/** 저장소를 통째로 바꾼다 — 가져오기에서만 쓴다 */
export function updateAllQuizResults(rows: QuizResult[]): void {
  writeAll(rows);
}
