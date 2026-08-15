/**
 * 단어장 규칙 계산
 * 계획서 데이터 변화 행위 2(만들기) · 3(이름·언어 바꾸기) · 4(휴지통에 넣기) 담당.
 * localStorage 를 직접 만지지 않고 storage 계층만 호출한다.
 */

import { wordbookInputSchema, type WordbookInput } from "@/lib/schemas/wordbook";
import { nowIso, runInTransaction } from "@/lib/storage/_client";
import type { Wordbook } from "@/lib/storage/_types";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { fail, ok, type ServiceResult } from "./_result";
import type { TrashWordbookResult, WordbookView } from "./wordbook.types";

/**
 * 단어장 목록 (단어 수 포함)
 *
 * sortOrder 가 작을수록 왼쪽이다. 새로 만든 단어장은 가장 작은 값을 받으므로 맨 왼쪽에 온다.
 * 값이 같으면 먼저 만든 것을 앞에 둔다(순서가 들쭉날쭉해 보이지 않게).
 */
export function listWordbooks(): WordbookView[] {
  const wordbooks = wordbookStorage.selectListWordbooks();
  const words = wordStorage.selectListWords();
  return wordbooks
    .map((wordbook) => ({
      ...wordbook,
      wordCount: words.filter((word) => word.wordbookId === wordbook.id).length,
    }))
    .sort(
      (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
    );
}

/** 휴지통에 있는 단어장 목록 */
export function listTrashedWordbooks(): Wordbook[] {
  return wordbookStorage.selectListWordbooks({ onlyDeleted: true });
}

/** 단어장 1개 */
export function getWordbook(id: string): Wordbook | null {
  return wordbookStorage.selectWordbook(id);
}

/**
 * 행위 2 — 단어장 만들기
 * 이름이 비었거나 같은 이름이 이미 있으면 아무것도 만들지 않는다.
 *
 * 🚨 새 단어장은 **항상 맨 왼쪽**에 와야 한다. 글로비시 품사 단어장이 10개나 되어
 *    끝에 붙이면 내가 만든 것이 12번째로 밀려나 쓰기 어렵다.
 */
export function createWordbook(input: WordbookInput): ServiceResult<Wordbook> {
  const parsed = wordbookInputSchema.safeParse(input);
  if (!parsed.success) return fail("wordbookNameRequired");

  const { name, lang } = parsed.data;
  if (wordbookStorage.selectWordbookByName(name) !== null) {
    return fail("wordbookNameDuplicated");
  }

  const created = runInTransaction(() =>
    wordbookStorage.insertWordbook({
      deletedAt: null,
      name,
      lang,
      isDefault: false,
      sortOrder: nextLeftmostSortOrder(),
    }),
  );
  return ok(created);
}

/** 지금 있는 값 중 가장 작은 것보다 1 작은 값 — 목록 맨 왼쪽 자리 */
function nextLeftmostSortOrder(): number {
  // 휴지통에 있는 것까지 봐야 되살렸을 때 순서가 겹치지 않는다
  const all = wordbookStorage.selectListWordbooks({ includeDeleted: true });
  if (all.length === 0) return 1;
  return Math.min(...all.map((wordbook) => wordbook.sortOrder)) - 1;
}

/**
 * 행위 3 — 단어장 이름·언어 바꾸기
 * 언어를 바꾸면 읽어주는 발음 언어가 함께 바뀌지만 단어 행 자체는 건드리지 않는다.
 */
export function renameWordbook(id: string, input: WordbookInput): ServiceResult<Wordbook> {
  const parsed = wordbookInputSchema.safeParse(input);
  if (!parsed.success) return fail("wordbookNameRequired");

  const current = wordbookStorage.selectWordbook(id);
  if (current === null) return fail("wordbookNotFound");
  if (current.deletedAt !== null) return fail("wordbookInTrash");

  const { name, lang } = parsed.data;
  const duplicated = wordbookStorage.selectWordbookByName(name);
  if (duplicated !== null && duplicated.id !== id) {
    return fail("wordbookNameDuplicated");
  }

  const updated = runInTransaction(() => wordbookStorage.updateWordbook(id, { name, lang }));
  if (updated === null) return fail("wordbookNotFound");
  return ok(updated);
}

/**
 * 행위 4 — 단어장을 휴지통에 넣기
 * 1) 그 단어장의 단어를 먼저 휴지통으로, 2) 그다음 단어장을 휴지통으로.
 * 기본 단어장(글로비시)은 지울 수 없다.
 */
export function trashWordbook(id: string): ServiceResult<TrashWordbookResult> {
  const current = wordbookStorage.selectWordbook(id);
  if (current === null) return fail("wordbookNotFound");
  if (current.isDefault) return fail("wordbookIsDefault");
  if (current.deletedAt !== null) return fail("wordbookInTrash");

  const result = runInTransaction(() => {
    const deletedAt = nowIso();
    const targetWordIds = wordStorage
      .selectListWords({ wordbookId: id })
      .map((word) => word.id);
    const trashedWordCount = wordStorage.updateWords(targetWordIds, { deletedAt });
    const wordbook = wordbookStorage.updateWordbook(id, { deletedAt });
    return { wordbook, trashedWordCount };
  });

  if (result.wordbook === null) return fail("wordbookNotFound");
  return ok({ wordbook: result.wordbook, trashedWordCount: result.trashedWordCount });
}

/**
 * 행위 8(단어장 쪽) — 휴지통에서 단어장 되살리기
 * 안의 단어는 사용자가 따로 고른 것만 되살린다(여기서 한꺼번에 되살리지 않는다).
 */
export function restoreWordbook(id: string): ServiceResult<Wordbook> {
  const current = wordbookStorage.selectWordbook(id);
  if (current === null) return fail("wordbookNotFound");

  const restored = runInTransaction(() =>
    wordbookStorage.updateWordbook(id, { deletedAt: null }),
  );
  if (restored === null) return fail("wordbookNotFound");
  return ok(restored);
}
