/**
 * 단어 입력 스키마 테스트 — 통과 케이스와 거부 케이스 양쪽
 */

import { wordEditSchema, wordInputSchema } from "./word";

const VALID = {
  wordbookId: "book-1",
  term: "ねこ",
  meaning: "고양이",
};

describe("wordInputSchema", () => {
  it("단어장·단어·뜻만 있으면 통과한다", () => {
    const result = wordInputSchema.safeParse(VALID);

    expect(result.success).toBe(true);
    if (!result.success) return;
    // 안 채운 칸은 빈 문자열로 채워진다
    expect(result.data.reading).toBe("");
    expect(result.data.example).toBe("");
    expect(result.data.memo).toBe("");
    // 계획서 6-2 — 내가 넣는 단어는 「보통(3)」에서 시작한다
    expect(result.data.difficulty).toBe(3);
    expect(result.data.importance).toBe(3);
  });

  it("앞뒤 공백을 없앤다", () => {
    const result = wordInputSchema.safeParse({ ...VALID, term: "  ねこ  " });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.term).toBe("ねこ");
  });

  it("단어가 비면 거절한다", () => {
    expect(wordInputSchema.safeParse({ ...VALID, term: "" }).success).toBe(false);
    expect(wordInputSchema.safeParse({ ...VALID, term: "    " }).success).toBe(false);
  });

  it("뜻이 비면 거절한다", () => {
    expect(wordInputSchema.safeParse({ ...VALID, meaning: "" }).success).toBe(false);
  });

  it("단어장을 안 고르면 거절한다", () => {
    expect(wordInputSchema.safeParse({ ...VALID, wordbookId: "" }).success).toBe(false);
  });

  it("너무 긴 단어는 거절한다", () => {
    expect(
      wordInputSchema.safeParse({ ...VALID, term: "가".repeat(101) }).success,
    ).toBe(false);
  });

  it("난이도는 1~5 만 받는다", () => {
    expect(wordInputSchema.safeParse({ ...VALID, difficulty: 0 }).success).toBe(false);
    expect(wordInputSchema.safeParse({ ...VALID, difficulty: 6 }).success).toBe(false);
    expect(wordInputSchema.safeParse({ ...VALID, difficulty: 2.5 }).success).toBe(false);
    expect(wordInputSchema.safeParse({ ...VALID, difficulty: 3 }).success).toBe(true);
  });
});

describe("wordEditSchema", () => {
  it("고칠 때는 단어장을 받지 않는다", () => {
    const result = wordEditSchema.safeParse({ term: "ねこ", meaning: "고양이" });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect("wordbookId" in result.data).toBe(false);
  });
});
