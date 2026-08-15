/**
 * 단어별 학습 기록 저장소
 * 함수명 prefix 는 select / selectList / insert / update / delete 5종만 쓴다.
 * 복습 단계 계산은 여기서 하지 않는다 — services/review 의 몫.
 */

import { createId, nowIso, readJson, writeJson } from "./_client";
import { STORAGE_KEYS } from "./_keys";
import type { WordRecord } from "./_types";

export type NewWordRecord = Omit<WordRecord, "id" | "createdAt" | "updatedAt">;
export type WordRecordPatch = Partial<Omit<WordRecord, "id" | "createdAt" | "updatedAt">>;

function readAll(): WordRecord[] {
  return readJson<WordRecord[]>(STORAGE_KEYS.wordRecords, []);
}

function writeAll(rows: WordRecord[]): void {
  writeJson(STORAGE_KEYS.wordRecords, rows);
}

/** 전체 학습 기록 */
export function selectListWordRecords(): WordRecord[] {
  return readAll();
}

/** 여러 단어의 기록을 한꺼번에 */
export function selectListWordRecordsByWordIds(wordIds: string[]): WordRecord[] {
  const target = new Set(wordIds);
  return readAll().filter((row) => target.has(row.wordId));
}

/** 단어 1개의 기록 */
export function selectWordRecord(wordId: string): WordRecord | null {
  return readAll().find((row) => row.wordId === wordId) ?? null;
}

/** 기록이 있는 단어 수 (= 한 번이라도 시험 본 단어 수) */
export function selectTestedWordCount(): number {
  return readAll().length;
}

/** 새 기록 추가 */
export function insertWordRecord(input: NewWordRecord): WordRecord {
  const now = nowIso();
  const row: WordRecord = { id: createId(), createdAt: now, updatedAt: now, ...input };
  writeAll([...readAll(), row]);
  return row;
}

/** 기록 고치기 (wordId 기준) */
export function updateWordRecord(wordId: string, patch: WordRecordPatch): WordRecord | null {
  const rows = readAll();
  const index = rows.findIndex((row) => row.wordId === wordId);
  if (index === -1) return null;

  const next: WordRecord = { ...rows[index], ...patch, updatedAt: nowIso() };
  const nextRows = [...rows];
  nextRows[index] = next;
  writeAll(nextRows);
  return next;
}

/** 진짜 삭제 — 해당 단어들의 기록이 사라진다 */
export function deleteWordRecordsByWordIds(wordIds: string[]): number {
  const target = new Set(wordIds);
  const rows = readAll();
  const nextRows = rows.filter((row) => !target.has(row.wordId));
  writeAll(nextRows);
  return rows.length - nextRows.length;
}

/** 학습 기록 전부 삭제 — 초기화(점수만 지우기)에서 쓴다 */
export function deleteAllWordRecords(): number {
  const count = readAll().length;
  writeAll([]);
  return count;
}

/** 저장소를 통째로 바꾼다 — 가져오기에서만 쓴다 */
export function updateAllWordRecords(rows: WordRecord[]): void {
  writeAll(rows);
}
