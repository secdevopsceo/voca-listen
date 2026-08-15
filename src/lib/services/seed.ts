/**
 * 첫 실행 시드 주입
 * 계획서 데이터 변화 행위 1(1회성 작업) 담당.
 *
 * 글로비시 1500 단어를 **품사별 단어장 10개**로 나눠 넣는다(계획서 4-1).
 * 이미 넣은 적이 있으면(meta 의 seededAt 이 차 있고 씨앗 번호가 최신이면) 아무것도 하지 않는다.
 *
 * 🚨 저장 구조 버전(SCHEMA_VERSION)이 올라가면 ensureSchemaVersion 이 옛 저장분을
 *    통째로 지운다 — 계획서가 승인한 "전체 초기화"가 그 장치로 이뤄진다.
 */

import { loadGlobishSeed, type GlobishSeedRow } from "@/lib/seed";
import { globishWordbookName, sortPartsOfSpeech } from "@/lib/seed/parts-of-speech";
import { ensureSchemaVersion, runInTransaction } from "@/lib/storage/_client";
import { SEED_VERSION } from "@/lib/storage/_keys";
import * as metaStorage from "@/lib/storage/meta";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { ok, type ServiceResult } from "./_result";

export interface SeedResult {
  /** 이번에 시드를 넣었는지 (이미 있었으면 false) */
  seeded: boolean;
  /** 만들어진 단어장 수 */
  wordbookCount: number;
  insertedWordCount: number;
}

/**
 * 행위 1 — 첫 실행 시 글로비시 단어를 품사별로 넣기
 * 앱을 열 때 한 번 부른다. 두 번째부터는 곧바로 seeded: false 로 돌아온다.
 */
export async function seedIfNeeded(): Promise<ServiceResult<SeedResult>> {
  // 저장 구조 버전이 다르면 낡은 저장분을 먼저 폐기한다(전체 초기화)
  ensureSchemaVersion();

  const meta = metaStorage.selectMeta();
  if (meta.seededAt !== null && meta.seedVersion >= SEED_VERSION) {
    return ok({ seeded: false, wordbookCount: 0, insertedWordCount: 0 });
  }

  // 메타만 지워진 경우 — 기본 단어장이 이미 있으면 다시 넣지 않는다
  const existingDefault = wordbookStorage.selectDefaultWordbook();
  if (existingDefault !== null) {
    metaStorage.insertMeta(SEED_VERSION);
    return ok({ seeded: false, wordbookCount: 0, insertedWordCount: 0 });
  }

  const rows = await loadGlobishSeed();
  const byPart = groupByPartOfSpeech(rows);
  const parts = sortPartsOfSpeech([...byPart.keys()]);

  const result = runInTransaction(() => {
    let insertedWordCount = 0;

    parts.forEach((part, index) => {
      const wordbook = wordbookStorage.insertWordbook({
        deletedAt: null,
        name: globishWordbookName(part),
        lang: "en",
        isDefault: true,
        // 문법책 순서 그대로 1부터. 사용자가 만든 단어장은 이보다 작은 값을 받는다
        sortOrder: index + 1,
      });

      const inserted = wordStorage.insertWords(
        (byPart.get(part) ?? []).map((row) => ({
          deletedAt: null,
          wordbookId: wordbook.id,
          term: row.term,
          meaning: row.meaning,
          reading: "",
          example: row.example,
          exampleMeaning: row.exampleMeaning,
          partOfSpeech: row.partOfSpeech,
          difficulty: row.difficulty,
          importance: row.importance,
          memo: "",
          starred: false,
        })),
      );
      insertedWordCount += inserted.length;
    });

    metaStorage.insertMeta(SEED_VERSION);

    return { wordbookCount: parts.length, insertedWordCount };
  });

  return ok({ seeded: true, ...result });
}

/** 품사가 비어 있는 단어는 버리지 않고 "기타" 로 모은다 */
const UNKNOWN_PART = "기타";

function groupByPartOfSpeech(rows: GlobishSeedRow[]): Map<string, GlobishSeedRow[]> {
  const map = new Map<string, GlobishSeedRow[]>();
  for (const row of rows) {
    const part = row.partOfSpeech.trim() === "" ? UNKNOWN_PART : row.partOfSpeech.trim();
    const bucket = map.get(part);
    if (bucket === undefined) map.set(part, [row]);
    else bucket.push(row);
  }
  return map;
}
