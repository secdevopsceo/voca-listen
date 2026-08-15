/**
 * 단어장 저장소
 * 함수명 prefix 는 select / selectList / insert / update / delete 5종만 쓴다.
 * 규칙 계산(삭제 가능 여부 등)은 하지 않는다 — service 의 몫.
 */

import { createId, nowIso, readJson, writeJson } from "./_client";
import { STORAGE_KEYS } from "./_keys";
import type { Wordbook } from "./_types";

/** 새 단어장을 만들 때 넣는 값 (id·시각은 저장소가 채운다) */
export type NewWordbook = Omit<Wordbook, "id" | "createdAt" | "updatedAt">;

/** 고칠 수 있는 값 */
export type WordbookPatch = Partial<Omit<Wordbook, "id" | "createdAt" | "updatedAt">>;

interface SelectListOptions {
  /** true 면 휴지통에 있는 것도 함께 준다 (기본 false) */
  includeDeleted?: boolean;
  /** true 면 휴지통에 있는 것만 준다 */
  onlyDeleted?: boolean;
}

function readAll(): Wordbook[] {
  return readJson<Wordbook[]>(STORAGE_KEYS.wordbooks, []);
}

function writeAll(rows: Wordbook[]): void {
  writeJson(STORAGE_KEYS.wordbooks, rows);
}

/** 단어장 목록 */
export function selectListWordbooks(options: SelectListOptions = {}): Wordbook[] {
  const rows = readAll();
  if (options.onlyDeleted) return rows.filter((row) => row.deletedAt !== null);
  if (options.includeDeleted) return rows;
  return rows.filter((row) => row.deletedAt === null);
}

/** 단어장 1개 (휴지통에 있어도 찾는다) */
export function selectWordbook(id: string): Wordbook | null {
  return readAll().find((row) => row.id === id) ?? null;
}

/** 이름으로 찾기 — 같은 이름이 이미 있는지 볼 때 쓴다 (휴지통 제외) */
export function selectWordbookByName(name: string): Wordbook | null {
  const target = name.trim().toLowerCase();
  return (
    readAll().find(
      (row) => row.deletedAt === null && row.name.trim().toLowerCase() === target,
    ) ?? null
  );
}

/** 기본 단어장(글로비시) */
export function selectDefaultWordbook(): Wordbook | null {
  return readAll().find((row) => row.isDefault) ?? null;
}

/** 단어장 수 (휴지통 제외) */
export function selectWordbookCount(): number {
  return selectListWordbooks().length;
}

/** 새 단어장 추가 */
export function insertWordbook(input: NewWordbook): Wordbook {
  const now = nowIso();
  const row: Wordbook = { id: createId(), createdAt: now, updatedAt: now, ...input };
  writeAll([...readAll(), row]);
  return row;
}

/** 단어장 고치기 — 휴지통에 넣기·되살리기도 deletedAt 을 통해 여기서 처리한다 */
export function updateWordbook(id: string, patch: WordbookPatch): Wordbook | null {
  const rows = readAll();
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return null;

  const next: Wordbook = { ...rows[index], ...patch, updatedAt: nowIso() };
  const nextRows = [...rows];
  nextRows[index] = next;
  writeAll(nextRows);
  return next;
}

/** 진짜 삭제 — 행 자체가 사라진다 */
export function deleteWordbooks(ids: string[]): number {
  const target = new Set(ids);
  const rows = readAll();
  const nextRows = rows.filter((row) => !target.has(row.id));
  writeAll(nextRows);
  return rows.length - nextRows.length;
}

/** 저장소를 통째로 바꾼다 — 가져오기·초기화에서만 쓴다 */
export function updateAllWordbooks(rows: Wordbook[]): void {
  writeAll(rows);
}
