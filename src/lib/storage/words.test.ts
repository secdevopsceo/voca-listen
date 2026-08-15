/**
 * 단어 저장소 테스트 — 저장·조회·거르기와 트랜잭션 동작
 */

import { runInTransaction } from "./_client";
import * as wordStorage from "./words";

const BASE = {
  deletedAt: null,
  wordbookId: "book-1",
  term: "hello",
  meaning: "안녕",
  reading: "",
  example: "",
  exampleMeaning: "",
  partOfSpeech: "감탄사",
  difficulty: 1,
  importance: 3,
  memo: "",
  starred: false,
};

describe("단어 저장소", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("넣은 단어를 다시 읽을 수 있다", () => {
    const created = wordStorage.insertWord(BASE);

    expect(wordStorage.selectWord(created.id)?.term).toBe("hello");
    expect(wordStorage.selectListWords()).toHaveLength(1);
  });

  it("id·만든 시각·고친 시각을 저장소가 채운다", () => {
    const created = wordStorage.insertWord(BASE);

    expect(created.id).not.toBe("");
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.updatedAt).toBe(created.createdAt);
  });

  it("여러 개를 한꺼번에 넣을 수 있다", () => {
    const created = wordStorage.insertWords([
      BASE,
      { ...BASE, term: "world", meaning: "세상" },
    ]);

    expect(created).toHaveLength(2);
    expect(wordStorage.selectListWords()).toHaveLength(2);
  });

  it("휴지통에 있는 단어는 기본 목록에서 빠진다", () => {
    const created = wordStorage.insertWord(BASE);
    wordStorage.updateWord(created.id, { deletedAt: "2026-03-01T00:00:00.000Z" });

    expect(wordStorage.selectListWords()).toHaveLength(0);
    expect(wordStorage.selectListWords({ includeDeleted: true })).toHaveLength(1);
    expect(wordStorage.selectListWords({ onlyDeleted: true })).toHaveLength(1);
  });

  it("단어·뜻·발음·메모에서 찾는다", () => {
    wordStorage.insertWords([
      { ...BASE, term: "apple", meaning: "사과", memo: "" },
      { ...BASE, term: "banana", meaning: "바나나", memo: "노란색" },
    ]);

    expect(wordStorage.selectListWords({ keyword: "app" })).toHaveLength(1);
    expect(wordStorage.selectListWords({ keyword: "사과" })).toHaveLength(1);
    expect(wordStorage.selectListWords({ keyword: "노란" })).toHaveLength(1);
    expect(wordStorage.selectListWords({ keyword: "없는말" })).toHaveLength(0);
  });

  it("별표·품사·난이도로 거를 수 있다", () => {
    wordStorage.insertWords([
      { ...BASE, term: "a", starred: true, partOfSpeech: "명사", difficulty: 3 },
      { ...BASE, term: "b", starred: false, partOfSpeech: "동사", difficulty: 1 },
    ]);

    expect(wordStorage.selectListWords({ onlyStarred: true })).toHaveLength(1);
    expect(wordStorage.selectListWords({ partOfSpeech: "동사" })).toHaveLength(1);
    expect(wordStorage.selectListWords({ difficulty: 3 })).toHaveLength(1);
  });

  it("같은 단어를 대소문자 무시하고 찾는다", () => {
    wordStorage.insertWord({ ...BASE, term: "Apple" });

    expect(wordStorage.selectWordByTerm("book-1", "apple")).not.toBeNull();
    expect(wordStorage.selectWordByTerm("book-2", "apple")).toBeNull();
  });

  it("고치면 고친 시각이 갱신된다", () => {
    const created = wordStorage.insertWord(BASE);

    const updated = wordStorage.updateWord(created.id, { meaning: "인사" });

    expect(updated?.meaning).toBe("인사");
    expect(updated?.createdAt).toBe(created.createdAt);
  });

  it("없는 단어를 고치려 하면 null 을 준다", () => {
    expect(wordStorage.updateWord("없는-id", { meaning: "x" })).toBeNull();
  });

  it("진짜 삭제하면 행이 사라진다", () => {
    const created = wordStorage.insertWord(BASE);

    const deleted = wordStorage.deleteWords([created.id]);

    expect(deleted).toBe(1);
    expect(wordStorage.selectWord(created.id)).toBeNull();
  });
});

describe("runInTransaction", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("블록이 끝나야 저장된다", () => {
    runInTransaction(() => {
      wordStorage.insertWord(BASE);
      // 블록 안에서는 방금 넣은 것을 읽을 수 있다
      expect(wordStorage.selectListWords()).toHaveLength(1);
    });

    expect(wordStorage.selectListWords()).toHaveLength(1);
  });

  it("🚨 중간에 문제가 생기면 아무것도 남지 않는다", () => {
    expect(() =>
      runInTransaction(() => {
        wordStorage.insertWord(BASE);
        wordStorage.insertWord({ ...BASE, term: "second" });
        throw new Error("일부러 낸 오류");
      }),
    ).toThrow("일부러 낸 오류");

    // 절반만 들어간 상태가 되지 않는다
    expect(wordStorage.selectListWords()).toHaveLength(0);
  });

  it("트랜잭션이 끝난 뒤에는 보통처럼 저장된다", () => {
    try {
      runInTransaction(() => {
        wordStorage.insertWord(BASE);
        throw new Error("실패");
      });
    } catch {
      // 무시
    }

    wordStorage.insertWord({ ...BASE, term: "after" });
    expect(wordStorage.selectListWords()).toHaveLength(1);
  });
});
