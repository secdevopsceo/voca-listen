/**
 * 단어 저장소
 * 함수명 prefix 는 select / selectList / insert / update / delete 5종만 쓴다.
 */

import { createId, nowIso, readJson, writeJson } from "./_client";
import { STORAGE_KEYS } from "./_keys";
import type { Word } from "./_types";

/** 새 단어를 만들 때 넣는 값 (id·시각은 저장소가 채운다) */
export type NewWord = Omit<Word, "id" | "createdAt" | "updatedAt">;

/** 고칠 수 있는 값 */
export type WordPatch = Partial<Omit<Word, "id" | "createdAt" | "updatedAt">>;

interface SelectListOptions {
  /** 이 단어장의 단어만 */
  wordbookId?: string;
  /** 여러 단어장 중 하나에 속한 단어만 */
  wordbookIds?: string[];
  /** true 면 휴지통에 있는 것도 함께 */
  includeDeleted?: boolean;
  /** true 면 휴지통에 있는 것만 */
  onlyDeleted?: boolean;
  /** true 면 별표가 켜진 것만 */
  onlyStarred?: boolean;
  /** 단어·뜻·발음·메모에서 찾을 말 */
  keyword?: string;
  /** 이 품사만 */
  partOfSpeech?: string;
  /** 이 난이도만 */
  difficulty?: number;
}

function readAll(): Word[] {
  return readJson<Word[]>(STORAGE_KEYS.words, []);
}

function writeAll(rows: Word[]): void {
  writeJson(STORAGE_KEYS.words, rows);
}

/** 단어 목록 */
export function selectListWords(options: SelectListOptions = {}): Word[] {
  let rows = readAll();

  if (options.onlyDeleted) {
    rows = rows.filter((row) => row.deletedAt !== null);
  } else if (!options.includeDeleted) {
    rows = rows.filter((row) => row.deletedAt === null);
  }

  if (options.wordbookId !== undefined) {
    rows = rows.filter((row) => row.wordbookId === options.wordbookId);
  }
  if (options.wordbookIds !== undefined) {
    const allowed = new Set(options.wordbookIds);
    rows = rows.filter((row) => allowed.has(row.wordbookId));
  }
  if (options.onlyStarred) {
    rows = rows.filter((row) => row.starred);
  }
  if (options.partOfSpeech !== undefined && options.partOfSpeech !== "") {
    rows = rows.filter((row) => row.partOfSpeech === options.partOfSpeech);
  }
  if (options.difficulty !== undefined) {
    rows = rows.filter((row) => row.difficulty === options.difficulty);
  }
  if (options.keyword !== undefined && options.keyword.trim() !== "") {
    const keyword = options.keyword.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.term.toLowerCase().includes(keyword) ||
        row.meaning.toLowerCase().includes(keyword) ||
        row.reading.toLowerCase().includes(keyword) ||
        row.memo.toLowerCase().includes(keyword),
    );
  }

  return rows;
}

/** 단어 1개 (휴지통에 있어도 찾는다) */
export function selectWord(id: string): Word | null {
  return readAll().find((row) => row.id === id) ?? null;
}

/** 같은 단어장 안에 같은 단어가 있는지 (휴지통 제외 · 대소문자 무시) */
export function selectWordByTerm(wordbookId: string, term: string): Word | null {
  const target = term.trim().toLowerCase();
  return (
    readAll().find(
      (row) =>
        row.deletedAt === null &&
        row.wordbookId === wordbookId &&
        row.term.trim().toLowerCase() === target,
    ) ?? null
  );
}

/** 단어 수 (휴지통 제외) */
export function selectWordCount(wordbookId?: string): number {
  return selectListWords(wordbookId === undefined ? {} : { wordbookId }).length;
}

/** 여러 id 로 한꺼번에 가져오기 */
export function selectListWordsByIds(ids: string[]): Word[] {
  const target = new Set(ids);
  return readAll().filter((row) => target.has(row.id));
}

/** 새 단어 추가 */
export function insertWord(input: NewWord): Word {
  const now = nowIso();
  const row: Word = { id: createId(), createdAt: now, updatedAt: now, ...input };
  writeAll([...readAll(), row]);
  return row;
}

/** 여러 단어를 한꺼번에 추가 — 시드·가져오기에서 쓴다 */
export function insertWords(inputs: NewWord[]): Word[] {
  const now = nowIso();
  const created = inputs.map((input) => ({
    id: createId(),
    createdAt: now,
    updatedAt: now,
    ...input,
  }));
  writeAll([...readAll(), ...created]);
  return created;
}

/** 단어 고치기 — 휴지통에 넣기·되살리기도 deletedAt 을 통해 여기서 처리한다 */
export function updateWord(id: string, patch: WordPatch): Word | null {
  const rows = readAll();
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return null;

  const next: Word = { ...rows[index], ...patch, updatedAt: nowIso() };
  const nextRows = [...rows];
  nextRows[index] = next;
  writeAll(nextRows);
  return next;
}

/** 여러 단어를 같은 값으로 한꺼번에 고치기 (단어장 삭제·초기화에서 쓴다) */
export function updateWords(ids: string[], patch: WordPatch): number {
  const target = new Set(ids);
  const now = nowIso();
  let changed = 0;
  const nextRows = readAll().map((row) => {
    if (!target.has(row.id)) return row;
    changed += 1;
    return { ...row, ...patch, updatedAt: now };
  });
  if (changed > 0) writeAll(nextRows);
  return changed;
}

/** 진짜 삭제 — 행 자체가 사라진다 */
export function deleteWords(ids: string[]): number {
  const target = new Set(ids);
  const rows = readAll();
  const nextRows = rows.filter((row) => !target.has(row.id));
  writeAll(nextRows);
  return rows.length - nextRows.length;
}

/** 저장소를 통째로 바꾼다 — 가져오기·초기화에서만 쓴다 */
export function updateAllWords(rows: Word[]): void {
  writeAll(rows);
}
