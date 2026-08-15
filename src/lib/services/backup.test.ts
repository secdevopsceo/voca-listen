/**
 * 내보내기·가져오기 테스트
 * 계획서 행위 13 — 특히 "형식이 맞지 않으면 한 줄도 넣지 않는다" 를 확인한다.
 */

import * as recordStorage from "@/lib/storage/word-records";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { exportCsv, exportJson, importCsv, importJson, parseCsv } from "./backup";

function seed() {
  const wordbook = wordbookStorage.insertWordbook({
    deletedAt: null,
    name: "일본어 여행",
    lang: "ja",
    isDefault: false,
    sortOrder: 1,
  });
  const word = wordStorage.insertWord({
    deletedAt: null,
    wordbookId: wordbook.id,
    term: "ねこ",
    meaning: "고양이",
    reading: "네코",
    example: "ねこがすきです。",
    exampleMeaning: "고양이를 좋아합니다.",
    partOfSpeech: "명사",
    difficulty: 2,
    importance: 3,
    memo: "귀엽다",
    starred: true,
  });
  recordStorage.insertWordRecord({
    deletedAt: null,
    wordId: word.id,
    correctCount: 3,
    wrongCount: 1,
    unknownCount: 0,
    lastTestedAt: "2026-03-01T00:00:00.000Z",
    reviewStage: 2,
    nextReviewAt: "2026-03-04T00:00:00.000Z",
  });
  return { wordbook, word };
}

describe("parseCsv", () => {
  it("따옴표 안의 쉼표를 한 칸으로 본다", () => {
    const rows = parseCsv('a,"b,c",d');
    expect(rows[0]).toEqual(["a", "b,c", "d"]);
  });

  it("두 번 쓴 따옴표는 따옴표 한 개로 읽는다", () => {
    const rows = parseCsv('"say ""hi""",x');
    expect(rows[0]).toEqual(['say "hi"', "x"]);
  });

  it("줄바꿈으로 줄을 나눈다", () => {
    const rows = parseCsv("a,b\nc,d");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("exportJson · importJson 왕복", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("내보낸 뒤 비우고 다시 넣으면 같은 데이터가 돌아온다", () => {
    seed();
    const file = exportJson();

    window.localStorage.clear();
    const result = importJson(file.content, "skip");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.createdWordbookCount).toBe(1);
    expect(result.data.createdWordCount).toBe(1);
    expect(result.data.importedRecordCount).toBe(1);

    const words = wordStorage.selectListWords();
    expect(words).toHaveLength(1);
    expect(words[0].term).toBe("ねこ");
    expect(words[0].reading).toBe("네코");
    expect(words[0].memo).toBe("귀엽다");
    expect(words[0].starred).toBe(true);

    const record = recordStorage.selectWordRecord(words[0].id);
    expect(record?.correctCount).toBe(3);
    expect(record?.reviewStage).toBe(2);
  });

  it("이미 있는 단어장에는 합치고, 같은 단어는 건너뛴다", () => {
    seed();
    const file = exportJson();

    // 지우지 않고 그대로 한 번 더 넣는다
    const result = importJson(file.content, "skip");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.createdWordbookCount).toBe(0);
    expect(result.data.createdWordCount).toBe(0);
    expect(result.data.skippedWordCount).toBe(1);
    expect(wordStorage.selectListWords()).toHaveLength(1);
  });

  it("덮어쓰기를 고르면 기존 단어의 뜻이 바뀐다", () => {
    const { word } = seed();
    const file = exportJson();
    wordStorage.updateWord(word.id, { meaning: "엉뚱한 뜻" });

    const result = importJson(file.content, "overwrite");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.updatedWordCount).toBe(1);
    expect(wordStorage.selectWord(word.id)?.meaning).toBe("고양이");
  });

  it("🚨 형식이 맞지 않으면 한 줄도 넣지 않는다", () => {
    const result = importJson('{"format":"something-else","version":1}', "skip");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalidBackupFile");
    expect(wordStorage.selectListWords()).toHaveLength(0);
    expect(wordbookStorage.selectListWordbooks()).toHaveLength(0);
  });

  it("JSON 이 아니면 거절한다", () => {
    const result = importJson("이건 그냥 글자", "skip");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalidBackupFile");
  });

  it("가져온 단어장은 기본 단어장이 되지 않는다", () => {
    wordbookStorage.insertWordbook({
      deletedAt: null,
      name: "기본",
      lang: "en",
      isDefault: true,
      sortOrder: 1,
    });
    const file = exportJson();

    window.localStorage.clear();
    importJson(file.content, "skip");

    expect(wordbookStorage.selectListWordbooks()[0].isDefault).toBe(false);
  });
});

describe("exportCsv · importCsv", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("내보낸 CSV 를 다시 넣으면 단어가 돌아온다", () => {
    seed();
    const file = exportCsv();

    window.localStorage.clear();
    const result = importCsv(file.content, "skip");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.createdWordCount).toBe(1);

    const words = wordStorage.selectListWords();
    expect(words[0].term).toBe("ねこ");
    expect(words[0].meaning).toBe("고양이");
    expect(words[0].memo).toBe("귀엽다");
  });

  it("CSV 에는 학습 기록이 담기지 않는다", () => {
    seed();
    const file = exportCsv();

    window.localStorage.clear();
    const result = importCsv(file.content, "skip");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.importedRecordCount).toBe(0);
    expect(recordStorage.selectListWordRecords()).toHaveLength(0);
  });

  it("🚨 한 줄이라도 단어나 뜻이 비면 통째로 거절한다", () => {
    const csv = [
      "wordbook,lang,term,meaning,reading,example,exampleMeaning,partOfSpeech,difficulty,memo",
      "단어장,ja,ねこ,고양이,,,,,1,",
      "단어장,ja,,뜻만 있음,,,,,1,",
    ].join("\n");

    const result = importCsv(csv, "skip");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalidBackupFile");
    // 앞 줄도 들어가지 않았다
    expect(wordStorage.selectListWords()).toHaveLength(0);
  });

  it("열 제목이 빠지면 거절한다", () => {
    const csv = ["term,meaning", "ねこ,고양이"].join("\n");

    const result = importCsv(csv, "skip");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalidBackupFile");
  });

  it("난이도가 이상하면 「보통(3)」으로 맞춘다", () => {
    const csv = [
      "wordbook,lang,term,meaning,reading,example,exampleMeaning,partOfSpeech,difficulty,memo",
      "단어장,ja,ねこ,고양이,,,,,99,",
    ].join("\n");

    importCsv(csv, "skip");

    expect(wordStorage.selectListWords()[0].difficulty).toBe(3);
  });
});
