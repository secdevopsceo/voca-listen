/**
 * 단어 규칙 계산
 * 계획서 데이터 변화 행위 5(추가) · 6(수정) · 7(휴지통) · 8(되살리기) · 9(휴지통 비우기) · 10(별표) 담당.
 * localStorage 를 직접 만지지 않고 storage 계층만 호출한다.
 */

import { wordEditSchema, wordInputSchema, type WordEditInput, type WordInput } from "@/lib/schemas/word";
import { nowIso, runInTransaction } from "@/lib/storage/_client";
import type { Word } from "@/lib/storage/_types";
import * as recordStorage from "@/lib/storage/word-records";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { fail, ok, type ServiceResult } from "./_result";
import { calcAccuracy } from "./review";
import type {
  AddWordOutcome,
  DuplicateAction,
  EmptyTrashResult,
  WordView,
} from "./word.types";

interface ListWordsOptions {
  wordbookId?: string;
  keyword?: string;
  partOfSpeech?: string;
  difficulty?: number;
  onlyStarred?: boolean;
}

/** 단어 목록 (단어장 이름·언어와 학습 기록 요약을 붙여서) */
export function listWords(options: ListWordsOptions = {}): WordView[] {
  const words = wordStorage.selectListWords(options);
  return attachViewFields(words);
}

/** 휴지통에 있는 단어 목록 */
export function listTrashedWords(): WordView[] {
  return attachViewFields(wordStorage.selectListWords({ onlyDeleted: true }));
}

/** 단어에 단어장 정보와 학습 기록을 붙인다 */
function attachViewFields(words: Word[]): WordView[] {
  const wordbooks = wordbookStorage.selectListWordbooks({ includeDeleted: true });
  const wordbookMap = new Map(wordbooks.map((wordbook) => [wordbook.id, wordbook]));
  const records = recordStorage.selectListWordRecordsByWordIds(words.map((word) => word.id));
  const recordMap = new Map(records.map((record) => [record.wordId, record]));

  return words.map((word) => {
    const wordbook = wordbookMap.get(word.wordbookId);
    const record = recordMap.get(word.id) ?? null;
    return {
      ...word,
      wordbookName: wordbook?.name ?? "Unknown",
      wordbookLang: wordbook?.lang ?? "en",
      correctCount: record?.correctCount ?? 0,
      wrongCount: record?.wrongCount ?? 0,
      accuracy: record === null ? 0 : calcAccuracy(record),
      reviewStage: record?.reviewStage ?? 0,
      nextReviewAt: record?.nextReviewAt ?? null,
      lastTestedAt: record?.lastTestedAt ?? null,
    };
  });
}

/**
 * 행위 5 — 단어 추가
 *
 * 같은 단어장에 같은 단어가 있으면 바로 넣지 않고 duplicated 로 돌려준다.
 * 사용자가 고른 뒤 action 을 주어 다시 부르면 「뜻 고치기」 또는 「새로 추가」를 한다.
 */
export function addWord(
  input: WordInput,
  action?: DuplicateAction,
): ServiceResult<AddWordOutcome> {
  const parsed = wordInputSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");

  const data = parsed.data;
  const wordbook = wordbookStorage.selectWordbook(data.wordbookId);
  if (wordbook === null) return fail("wordbookNotFound");
  if (wordbook.deletedAt !== null) return fail("wordbookInTrash");

  const existing = wordStorage.selectWordByTerm(data.wordbookId, data.term);

  // 이미 있는데 사용자가 아직 고르지 않았으면 물어보라고 돌려준다
  if (existing !== null && action === undefined) {
    return ok({ kind: "duplicated", existing });
  }

  // 「뜻 고치기」 — 새 행을 만들지 않고 기존 행을 고친다
  if (existing !== null && action === "edit") {
    const updated = runInTransaction(() =>
      wordStorage.updateWord(existing.id, {
        meaning: data.meaning,
        reading: data.reading,
        example: data.example,
        exampleMeaning: data.exampleMeaning,
        partOfSpeech: data.partOfSpeech,
        difficulty: data.difficulty,
        importance: data.importance,
        memo: data.memo,
      }),
    );
    if (updated === null) return fail("wordNotFound");
    return ok({ kind: "updated", word: updated });
  }

  // 새로 추가 (중복이 없거나 사용자가 「새로 추가」를 골랐을 때)
  const created = runInTransaction(() =>
    wordStorage.insertWord({
      deletedAt: null,
      wordbookId: data.wordbookId,
      term: data.term,
      meaning: data.meaning,
      reading: data.reading,
      example: data.example,
      exampleMeaning: data.exampleMeaning,
      partOfSpeech: data.partOfSpeech,
      difficulty: data.difficulty,
      importance: data.importance,
      memo: data.memo,
      starred: false,
    }),
  );
  return ok({ kind: "created", word: created });
}

/**
 * 행위 6 — 단어 수정
 * 학습 기록(맞힌/틀린 횟수·복습 단계)은 일부러 건드리지 않는다.
 */
export function editWord(id: string, input: WordEditInput): ServiceResult<Word> {
  const parsed = wordEditSchema.safeParse(input);
  if (!parsed.success) return fail("invalidInput");

  const current = wordStorage.selectWord(id);
  if (current === null) return fail("wordNotFound");
  if (current.deletedAt !== null) return fail("wordNotFound");

  const updated = runInTransaction(() => wordStorage.updateWord(id, parsed.data));
  if (updated === null) return fail("wordNotFound");
  return ok(updated);
}

/**
 * 행위 7 — 단어를 휴지통에 넣기 (표시만 삭제)
 * 학습 기록은 함께 보관해, 되살리면 정답률이 그대로 돌아온다.
 */
export function trashWord(id: string): ServiceResult<Word> {
  const current = wordStorage.selectWord(id);
  if (current === null) return fail("wordNotFound");

  const updated = runInTransaction(() =>
    wordStorage.updateWord(id, { deletedAt: nowIso() }),
  );
  if (updated === null) return fail("wordNotFound");
  return ok(updated);
}

/**
 * 행위 8 — 휴지통에서 단어 되살리기
 * 그 단어의 단어장이 아직 휴지통에 있으면 되살릴 수 없다.
 */
export function restoreWord(id: string): ServiceResult<Word> {
  const current = wordStorage.selectWord(id);
  if (current === null) return fail("wordNotFound");

  const wordbook = wordbookStorage.selectWordbook(current.wordbookId);
  if (wordbook === null) return fail("wordbookNotFound");
  if (wordbook.deletedAt !== null) return fail("wordbookInTrash");

  const restored = runInTransaction(() => wordStorage.updateWord(id, { deletedAt: null }));
  if (restored === null) return fail("wordNotFound");
  return ok(restored);
}

/**
 * 행위 9 — 휴지통 비우기 (진짜 삭제)
 * 학습 기록 → 단어 → 단어장 순서로 지운다. 주인 없는 기록이 남지 않게 기록을 먼저 지운다.
 * 되돌릴 수 없다.
 */
export function emptyTrash(): ServiceResult<EmptyTrashResult> {
  const result = runInTransaction(() => {
    const trashedWords = wordStorage.selectListWords({ onlyDeleted: true });
    const trashedWordIds = trashedWords.map((word) => word.id);
    const trashedWordbookIds = wordbookStorage
      .selectListWordbooks({ onlyDeleted: true })
      .map((wordbook) => wordbook.id);

    const deletedRecordCount = recordStorage.deleteWordRecordsByWordIds(trashedWordIds);
    const deletedWordCount = wordStorage.deleteWords(trashedWordIds);
    const deletedWordbookCount = wordbookStorage.deleteWordbooks(trashedWordbookIds);

    return { deletedWordCount, deletedWordbookCount, deletedRecordCount };
  });
  return ok(result);
}

/** 행위 10 — 별표 켜기·끄기 */
export function toggleStar(id: string): ServiceResult<Word> {
  const current = wordStorage.selectWord(id);
  if (current === null) return fail("wordNotFound");

  const updated = runInTransaction(() =>
    wordStorage.updateWord(id, { starred: !current.starred }),
  );
  if (updated === null) return fail("wordNotFound");
  return ok(updated);
}
