/**
 * 단어장 규칙 테스트
 * 계획서 행위 2(만들기) · 3(이름·언어 바꾸기) · 4(휴지통에 넣기)
 */

import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import {
  createWordbook,
  listWordbooks,
  renameWordbook,
  restoreWordbook,
  trashWordbook,
} from "./wordbook";

function makeDefaultWordbook() {
  return wordbookStorage.insertWordbook({
    deletedAt: null,
    name: "글로비시 1500",
    lang: "en",
    isDefault: true,
    sortOrder: 1,
  });
}

describe("createWordbook", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("새 단어장을 만든다", () => {
    const result = createWordbook({ name: "일본어 여행", lang: "ja" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("일본어 여행");
    expect(result.data.lang).toBe("ja");
    expect(result.data.isDefault).toBe(false);
  });

  it("이름이 비면 만들지 않는다", () => {
    const result = createWordbook({ name: "   ", lang: "ja" });

    expect(result.ok).toBe(false);
    expect(wordbookStorage.selectListWordbooks()).toHaveLength(0);
  });

  it("같은 이름은 두 번 만들 수 없다", () => {
    createWordbook({ name: "프랑스어", lang: "fr" });

    const result = createWordbook({ name: "프랑스어", lang: "fr" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("wordbookNameDuplicated");
    expect(wordbookStorage.selectListWordbooks()).toHaveLength(1);
  });
});

describe("renameWordbook", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("이름과 언어를 바꾼다", () => {
    const created = createWordbook({ name: "옛 이름", lang: "en" });
    if (!created.ok) throw new Error("setup failed");

    const result = renameWordbook(created.data.id, { name: "새 이름", lang: "fr" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("새 이름");
    expect(result.data.lang).toBe("fr");
  });

  it("언어를 바꿔도 단어 행은 건드리지 않는다", () => {
    const created = createWordbook({ name: "단어장", lang: "en" });
    if (!created.ok) throw new Error("setup failed");
    const word = wordStorage.insertWord({
      deletedAt: null,
      wordbookId: created.data.id,
      term: "hello",
      meaning: "안녕",
      reading: "",
      example: "",
      exampleMeaning: "",
      partOfSpeech: "",
      difficulty: 1,
      importance: 3,
      memo: "",
      starred: false,
    });

    renameWordbook(created.data.id, { name: "단어장", lang: "fr" });

    const after = wordStorage.selectWord(word.id);
    expect(after?.term).toBe("hello");
    expect(after?.meaning).toBe("안녕");
  });

  it("자기 이름은 그대로 둬도 된다(중복으로 보지 않는다)", () => {
    const created = createWordbook({ name: "그대로", lang: "en" });
    if (!created.ok) throw new Error("setup failed");

    const result = renameWordbook(created.data.id, { name: "그대로", lang: "ja" });

    expect(result.ok).toBe(true);
  });
});

describe("trashWordbook", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("🚨 기본 단어장은 지울 수 없다", () => {
    const wordbook = makeDefaultWordbook();

    const result = trashWordbook(wordbook.id);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("wordbookIsDefault");
    expect(wordbookStorage.selectWordbook(wordbook.id)?.deletedAt).toBeNull();
  });

  it("단어장을 지우면 안의 단어도 함께 휴지통으로 간다", () => {
    const created = createWordbook({ name: "지울 단어장", lang: "ja" });
    if (!created.ok) throw new Error("setup failed");
    wordStorage.insertWords([
      {
        deletedAt: null,
        wordbookId: created.data.id,
        term: "a",
        meaning: "가",
        reading: "",
        example: "",
        exampleMeaning: "",
        partOfSpeech: "",
        difficulty: 1,
        importance: 3,
        memo: "",
        starred: false,
      },
      {
        deletedAt: null,
        wordbookId: created.data.id,
        term: "b",
        meaning: "나",
        reading: "",
        example: "",
        exampleMeaning: "",
        partOfSpeech: "",
        difficulty: 1,
        importance: 3,
        memo: "",
        starred: false,
      },
    ]);

    const result = trashWordbook(created.data.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.trashedWordCount).toBe(2);
    expect(wordStorage.selectListWords()).toHaveLength(0);
    expect(wordStorage.selectListWords({ onlyDeleted: true })).toHaveLength(2);
    expect(listWordbooks()).toHaveLength(0);
  });

  it("다른 단어장의 단어는 건드리지 않는다", () => {
    const target = createWordbook({ name: "지울 것", lang: "ja" });
    const keep = createWordbook({ name: "남길 것", lang: "en" });
    if (!target.ok || !keep.ok) throw new Error("setup failed");

    wordStorage.insertWord({
      deletedAt: null,
      wordbookId: target.data.id,
      term: "drop",
      meaning: "지울 단어",
      reading: "",
      example: "",
      exampleMeaning: "",
      partOfSpeech: "",
      difficulty: 1,
      importance: 3,
      memo: "",
      starred: false,
    });
    const survivor = wordStorage.insertWord({
      deletedAt: null,
      wordbookId: keep.data.id,
      term: "keep",
      meaning: "남길 단어",
      reading: "",
      example: "",
      exampleMeaning: "",
      partOfSpeech: "",
      difficulty: 1,
      importance: 3,
      memo: "",
      starred: false,
    });

    trashWordbook(target.data.id);

    expect(wordStorage.selectWord(survivor.id)?.deletedAt).toBeNull();
    expect(wordStorage.selectListWords()).toHaveLength(1);
  });

  it("되살리면 단어장이 목록으로 돌아온다", () => {
    const created = createWordbook({ name: "되살릴 것", lang: "ja" });
    if (!created.ok) throw new Error("setup failed");

    trashWordbook(created.data.id);
    expect(listWordbooks()).toHaveLength(0);

    restoreWordbook(created.data.id);
    expect(listWordbooks()).toHaveLength(1);
  });
});

describe("listWordbooks", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("단어 수를 함께 알려준다(휴지통 단어는 빼고)", () => {
    const created = createWordbook({ name: "세는 단어장", lang: "en" });
    if (!created.ok) throw new Error("setup failed");
    const words = wordStorage.insertWords(
      Array.from({ length: 3 }, (_, index) => ({
        deletedAt: null,
        wordbookId: created.data.id,
        term: `w${index}`,
        meaning: `뜻${index}`,
        reading: "",
        example: "",
        exampleMeaning: "",
        partOfSpeech: "",
        difficulty: 1,
        importance: 3,
        memo: "",
        starred: false,
      })),
    );
    wordStorage.updateWord(words[0].id, { deletedAt: "2026-03-01T00:00:00.000Z" });

    expect(listWordbooks()[0].wordCount).toBe(2);
  });
});

describe("단어장 나열 순서 (계획서 4-2)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("🚨 새로 만든 단어장이 목록 맨 왼쪽에 온다", () => {
    // 글로비시 품사 단어장을 흉내 낸다 (sortOrder 1~3)
    for (const [index, name] of ["글로비시 · 명사", "글로비시 · 동사", "글로비시 · 형용사"].entries()) {
      wordbookStorage.insertWordbook({
        deletedAt: null,
        name,
        lang: "en",
        isDefault: true,
        sortOrder: index + 1,
      });
    }

    const first = createWordbook({ name: "내 단어장", lang: "ja" });
    expect(first.ok).toBe(true);

    // 새로 만든 것이 가장 앞
    expect(listWordbooks().map((book) => book.name)[0]).toBe("내 단어장");

    // 하나 더 만들면 그것이 다시 맨 앞
    createWordbook({ name: "더 새 단어장", lang: "fr" });
    expect(listWordbooks().map((book) => book.name)).toEqual([
      "더 새 단어장",
      "내 단어장",
      "글로비시 · 명사",
      "글로비시 · 동사",
      "글로비시 · 형용사",
    ]);
  });

  it("글로비시 단어장은 문법책 순서(sortOrder)대로 나온다", () => {
    wordbookStorage.insertWordbook({
      deletedAt: null,
      name: "글로비시 · 형용사",
      lang: "en",
      isDefault: true,
      sortOrder: 5,
    });
    wordbookStorage.insertWordbook({
      deletedAt: null,
      name: "글로비시 · 명사",
      lang: "en",
      isDefault: true,
      sortOrder: 1,
    });

    expect(listWordbooks().map((book) => book.name)).toEqual([
      "글로비시 · 명사",
      "글로비시 · 형용사",
    ]);
  });
});
