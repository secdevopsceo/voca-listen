/**
 * 백업(내보내기·가져오기) 규칙 계산
 * 계획서 데이터 변화 행위 13(파일 가져오기) 담당. 내보내기는 읽기만 하므로 데이터 변화가 없다.
 *
 * 🚨 가져오기는 파일 전체를 먼저 검사해 형식이 맞지 않으면 **한 줄도 넣지 않는다**
 * (절반만 들어간 상태를 만들지 않는다).
 */

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFileSchema,
  type ImportConflictMode,
} from "@/lib/schemas/backup";
import { nowIso, runInTransaction } from "@/lib/storage/_client";
import type { LangCode } from "@/lib/storage/_types";
import * as quizResultStorage from "@/lib/storage/quiz-results";
import * as recordStorage from "@/lib/storage/word-records";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { fail, ok, type ServiceResult } from "./_result";
import type { ExportedFile, ImportResult } from "./backup.types";

/** CSV 열 제목 — 내보낼 때 쓰는 전체 목록 */
const CSV_HEADERS = [
  "wordbook",
  "lang",
  "term",
  "meaning",
  "reading",
  "example",
  "exampleMeaning",
  "partOfSpeech",
  "difficulty",
  "importance",
  "memo",
] as const;

/**
 * 가져올 때 **반드시 있어야 하는** 열.
 *
 * 🚨 importance 는 여기서 뺀다. 이번에 새로 생긴 열이라, 넣기 전에 내보낸 옛 CSV 파일에는
 *    없다. 필수로 두면 예전 백업 파일이 전부 거절당한다(실제로 그렇게 만들었다가 잡았다).
 *    없으면 「보통(3)」으로 채운다(계획서 행위 5).
 */
const REQUIRED_CSV_HEADERS = CSV_HEADERS.filter((name) => name !== "importance");

/** 전체를 JSON 으로 내보낸다 (학습 기록·시험 기록까지 포함 — 완전 복원용) */
export function exportJson(): ExportedFile {
  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: nowIso(),
    wordbooks: wordbookStorage.selectListWordbooks({ includeDeleted: true }),
    words: wordStorage.selectListWords({ includeDeleted: true }),
    wordRecords: recordStorage.selectListWordRecords(),
    quizResults: quizResultStorage.selectListQuizResults(),
  };
  return {
    fileName: `voca-listen-backup-${nowIso().slice(0, 10)}.json`,
    content: JSON.stringify(payload, null, 2),
    mimeType: "application/json",
  };
}

/** 단어 목록을 CSV 로 내보낸다 (엑셀 편집용 — 학습 기록은 담지 않는다) */
export function exportCsv(): ExportedFile {
  const wordbooks = wordbookStorage.selectListWordbooks({ includeDeleted: true });
  const wordbookMap = new Map(wordbooks.map((wordbook) => [wordbook.id, wordbook]));
  const words = wordStorage.selectListWords();

  const rows = words.map((word) => {
    const wordbook = wordbookMap.get(word.wordbookId);
    return [
      wordbook?.name ?? "Unknown",
      wordbook?.lang ?? "en",
      word.term,
      word.meaning,
      word.reading,
      word.example,
      word.exampleMeaning,
      word.partOfSpeech,
      String(word.difficulty),
      String(word.importance),
      word.memo,
    ];
  });

  const lines = [CSV_HEADERS.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))];
  return {
    fileName: `voca-listen-words-${nowIso().slice(0, 10)}.csv`,
    // 엑셀이 한글을 깨뜨리지 않도록 BOM 을 붙인다
    content: `﻿${lines.join("\n")}`,
    mimeType: "text/csv;charset=utf-8",
  };
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 행위 13 — JSON 백업 파일 가져오기
 *
 * 같은 이름의 단어장이 있으면 그 단어장에 합치고, 없으면 새로 만든다.
 * 같은 단어를 만나면 conflictMode 대로 건너뛰거나 덮어쓴다.
 * 학습 기록은 이번에 새로 들어온 단어에 대해서만 넣는다(기존 단어의 기록은 지키기 위해).
 */
export function importJson(
  content: string,
  conflictMode: ImportConflictMode,
): ServiceResult<ImportResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return fail("invalidBackupFile");
  }

  const parsed = backupFileSchema.safeParse(raw);
  if (!parsed.success) return fail("invalidBackupFile");

  const file = parsed.data;

  const result = runInTransaction(() => {
    const counters: ImportResult = {
      createdWordbookCount: 0,
      createdWordCount: 0,
      updatedWordCount: 0,
      skippedWordCount: 0,
      importedRecordCount: 0,
    };

    // 파일의 단어장 id → 지금 저장소의 단어장 id
    const wordbookIdMap = new Map<string, string>();

    for (const fileWordbook of file.wordbooks) {
      const existing = wordbookStorage.selectWordbookByName(fileWordbook.name);
      if (existing !== null) {
        wordbookIdMap.set(fileWordbook.id, existing.id);
        continue;
      }
      const created = wordbookStorage.insertWordbook({
        deletedAt: null,
        name: fileWordbook.name,
        lang: fileWordbook.lang,
        // 가져온 단어장은 기본 단어장으로 삼지 않는다
        isDefault: false,
        // 내가 가져온 단어장도 목록 맨 왼쪽에 온다(계획서 4-2)
        sortOrder: leftmostSortOrder(),
      });
      wordbookIdMap.set(fileWordbook.id, created.id);
      counters.createdWordbookCount += 1;
    }

    // 파일의 단어 id → 새로 만든 단어 id (학습 기록을 옮길 때 쓴다)
    const newWordIdMap = new Map<string, string>();

    for (const fileWord of file.words) {
      const wordbookId = wordbookIdMap.get(fileWord.wordbookId);
      // 어느 단어장에 넣어야 할지 모르는 단어는 건너뛴다
      if (wordbookId === undefined) {
        counters.skippedWordCount += 1;
        continue;
      }

      const existing = wordStorage.selectWordByTerm(wordbookId, fileWord.term);
      if (existing !== null) {
        if (conflictMode === "skip") {
          counters.skippedWordCount += 1;
          continue;
        }
        wordStorage.updateWord(existing.id, {
          meaning: fileWord.meaning,
          reading: fileWord.reading,
          example: fileWord.example,
          exampleMeaning: fileWord.exampleMeaning,
          partOfSpeech: fileWord.partOfSpeech,
          difficulty: normalizeGrade(fileWord.difficulty),
          importance: normalizeGrade(fileWord.importance),
          memo: fileWord.memo,
        });
        counters.updatedWordCount += 1;
        continue;
      }

      const created = wordStorage.insertWord({
        deletedAt: fileWord.deletedAt,
        wordbookId,
        term: fileWord.term,
        meaning: fileWord.meaning,
        reading: fileWord.reading,
        example: fileWord.example,
        exampleMeaning: fileWord.exampleMeaning,
        partOfSpeech: fileWord.partOfSpeech,
        difficulty: normalizeGrade(fileWord.difficulty),
        importance: normalizeGrade(fileWord.importance),
        memo: fileWord.memo,
        starred: fileWord.starred,
      });
      newWordIdMap.set(fileWord.id, created.id);
      counters.createdWordCount += 1;
    }

    // 학습 기록 — 새로 들어온 단어에만
    for (const fileRecord of file.wordRecords ?? []) {
      const wordId = newWordIdMap.get(fileRecord.wordId);
      if (wordId === undefined) continue;
      recordStorage.insertWordRecord({
        deletedAt: null,
        wordId,
        correctCount: fileRecord.correctCount,
        wrongCount: fileRecord.wrongCount,
        unknownCount: fileRecord.unknownCount,
        lastTestedAt: fileRecord.lastTestedAt,
        reviewStage: fileRecord.reviewStage,
        nextReviewAt: fileRecord.nextReviewAt,
      });
      counters.importedRecordCount += 1;
    }

    return counters;
  });

  return ok(result);
}

/**
 * 행위 13 — CSV 파일 가져오기
 * CSV 에는 학습 기록이 없으므로 단어장·단어만 들어간다.
 */
export function importCsv(
  content: string,
  conflictMode: ImportConflictMode,
): ServiceResult<ImportResult> {
  const rows = parseCsv(content.replace(/^﻿/, ""));
  if (rows.length < 2) return fail("invalidBackupFile");

  const header = rows[0].map((cell) => cell.trim());
  const missing = REQUIRED_CSV_HEADERS.filter((name) => !header.includes(name));
  if (missing.length > 0) return fail("invalidBackupFile");

  const indexOf = (name: (typeof CSV_HEADERS)[number]) => header.indexOf(name);
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim() !== ""));

  // 넣기 전에 전부 검사한다 — 한 줄이라도 단어·뜻이 비면 통째로 거절
  for (const row of dataRows) {
    const term = (row[indexOf("term")] ?? "").trim();
    const meaning = (row[indexOf("meaning")] ?? "").trim();
    const wordbookName = (row[indexOf("wordbook")] ?? "").trim();
    if (term === "" || meaning === "" || wordbookName === "") {
      return fail("invalidBackupFile");
    }
  }

  const result = runInTransaction(() => {
    const counters: ImportResult = {
      createdWordbookCount: 0,
      createdWordCount: 0,
      updatedWordCount: 0,
      skippedWordCount: 0,
      importedRecordCount: 0,
    };
    const wordbookIdByName = new Map<string, string>();

    for (const row of dataRows) {
      const wordbookName = (row[indexOf("wordbook")] ?? "").trim();
      const langValue = (row[indexOf("lang")] ?? "en").trim();
      const lang: LangCode =
        langValue === "ja" || langValue === "fr" || langValue === "en" ? langValue : "en";

      let wordbookId = wordbookIdByName.get(wordbookName);
      if (wordbookId === undefined) {
        const existing = wordbookStorage.selectWordbookByName(wordbookName);
        if (existing !== null) {
          wordbookId = existing.id;
        } else {
          const created = wordbookStorage.insertWordbook({
            deletedAt: null,
            name: wordbookName,
            lang,
            isDefault: false,
            sortOrder: leftmostSortOrder(),
          });
          wordbookId = created.id;
          counters.createdWordbookCount += 1;
        }
        wordbookIdByName.set(wordbookName, wordbookId);
      }

      const term = (row[indexOf("term")] ?? "").trim();
      const difficulty = parseGrade(row[indexOf("difficulty")]);
      const importance = parseGrade(row[indexOf("importance")]);

      const payload = {
        meaning: (row[indexOf("meaning")] ?? "").trim(),
        reading: (row[indexOf("reading")] ?? "").trim(),
        example: (row[indexOf("example")] ?? "").trim(),
        exampleMeaning: (row[indexOf("exampleMeaning")] ?? "").trim(),
        partOfSpeech: (row[indexOf("partOfSpeech")] ?? "").trim(),
        difficulty,
        importance,
        memo: (row[indexOf("memo")] ?? "").trim(),
      };

      const existingWord = wordStorage.selectWordByTerm(wordbookId, term);
      if (existingWord !== null) {
        if (conflictMode === "skip") {
          counters.skippedWordCount += 1;
          continue;
        }
        wordStorage.updateWord(existingWord.id, payload);
        counters.updatedWordCount += 1;
        continue;
      }

      wordStorage.insertWord({
        deletedAt: null,
        wordbookId,
        term,
        starred: false,
        ...payload,
      });
      counters.createdWordCount += 1;
    }

    return counters;
  });

  return ok(result);
}

/** 아주 단순한 CSV 파서 — 따옴표로 감싼 칸과 그 안의 쉼표·줄바꿈을 처리한다 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/**
 * 가져온 단어장은 목록 맨 왼쪽에 온다 (계획서 4-2).
 * 지금 있는 값 중 가장 작은 것보다 1 작은 값을 준다.
 */
function leftmostSortOrder(): number {
  const all = wordbookStorage.selectListWordbooks({ includeDeleted: true });
  if (all.length === 0) return 1;
  return Math.min(...all.map((wordbook) => wordbook.sortOrder)) - 1;
}

/**
 * 중요도·난이도를 읽는다. 값이 없거나 1~5 밖이면 「보통」(3) — 계획서 행위 5.
 *
 * 🚨 범위 밖 값을 5 로 자르지 않는다. 9 같은 값은 사람이 잘못 적은 것이지
 *    "가장 어려움"을 뜻한 게 아니라, 잘라 버리면 엉뚱한 등급이 박힌다.
 */
function normalizeGrade(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 3;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) return 3;
  return rounded;
}

/** CSV 칸에서 등급을 읽는다. 비어 있거나 범위 밖이면 「보통」(3) */
function parseGrade(raw: string | undefined): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  return normalizeGrade(Number.isFinite(parsed) ? parsed : undefined);
}
