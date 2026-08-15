/**
 * 읽어줄 항목 만들기 테스트
 * 설정의 "읽는 범위" 대로 무엇을 읽는지 확인한다.
 */

import { buildSpeakItems } from "./items";

const WORD = {
  term: "ねこ",
  meaning: "고양이",
  example: "ねこがすきです。",
  exampleMeaning: "고양이를 좋아합니다.",
};

describe("buildSpeakItems", () => {
  it("단어만 읽기", () => {
    const items = buildSpeakItems(WORD, "term", "ja");

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ text: "ねこ", bcp47: "ja-JP", part: "term" });
  });

  it("단어와 뜻을 읽기 — 뜻은 한국어 음성으로", () => {
    const items = buildSpeakItems(WORD, "term_meaning", "ja");

    expect(items).toHaveLength(2);
    expect(items[0].bcp47).toBe("ja-JP");
    expect(items[1]).toEqual({ text: "고양이", bcp47: "ko-KR", part: "meaning" });
  });

  it("예문까지 읽기 — 예문은 그 나라 말로 읽고 예문 뜻은 읽지 않는다", () => {
    const items = buildSpeakItems(WORD, "term_meaning_example", "ja");

    expect(items).toHaveLength(3);
    expect(items[2]).toEqual({
      text: "ねこがすきです。",
      bcp47: "ja-JP",
      part: "example",
    });
  });

  it("🚨 예문 뜻까지 읽기 — 네 번째 범위에서만 예문 뜻이 붙는다", () => {
    const items = buildSpeakItems(WORD, "term_meaning_example_meaning", "ja");

    expect(items).toHaveLength(4);
    expect(items.map((item) => item.part)).toEqual([
      "term",
      "meaning",
      "example",
      "exampleMeaning",
    ]);
    expect(items[3]).toEqual({
      text: "고양이를 좋아합니다.",
      bcp47: "ko-KR",
      part: "exampleMeaning",
    });
  });

  it("비어 있는 칸은 건너뛴다(침묵이 생기지 않게)", () => {
    const items = buildSpeakItems(
      { ...WORD, example: "", exampleMeaning: "" },
      "term_meaning_example",
      "fr",
    );

    expect(items).toHaveLength(2);
    expect(items.every((item) => item.text.trim() !== "")).toBe(true);
  });

  it("단어장 언어에 맞는 발음 언어를 쓴다", () => {
    expect(buildSpeakItems(WORD, "term", "fr")[0].bcp47).toBe("fr-FR");
    expect(buildSpeakItems(WORD, "term", "en")[0].bcp47).toBe("en-US");
  });

  it("단어가 비면 아무것도 읽지 않는다", () => {
    const items = buildSpeakItems({ ...WORD, term: "  " }, "term", "ja");
    expect(items).toHaveLength(0);
  });
});
