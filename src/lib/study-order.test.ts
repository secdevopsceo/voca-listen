/**
 * 듣기 순서 테스트 (계획서 6-3)
 *
 * 이번 작업의 출발점이 "듣기가 항상 a 부터 시작한다" 였으므로,
 * 가나다순으로 돌아가지 않는다는 것을 특히 못 박아 둔다.
 */

import { orderForListening, type OrderableWord } from "./study-order";

/** 필요한 값만 채운 단어 */
function word(
  term: string,
  options: Partial<Omit<OrderableWord, "term">> = {},
): OrderableWord {
  return {
    term,
    wrongCount: 0,
    lastTestedAt: null,
    nextReviewAt: null,
    importance: 3,
    ...options,
  };
}

describe("orderForListening", () => {
  it("🚨 가나다순으로 그대로 두지 않는다", () => {
    const words = [
      word("apple", { lastTestedAt: "2026-08-01T00:00:00.000Z" }),
      word("zebra", { wrongCount: 2 }),
    ];

    const ordered = orderForListening(words);

    // 틀렸던 zebra 가 먼저 온다 — a 부터 시작하지 않는다
    expect(ordered.map((item) => item.term)).toEqual(["zebra", "apple"]);
  });

  it("틀린 것 → 안 본 것 → 맞혔던 것 차례로 늘어놓는다", () => {
    const words = [
      word("correct", { lastTestedAt: "2026-08-01T00:00:00.000Z" }),
      word("never"),
      word("wrong", { wrongCount: 1, lastTestedAt: "2026-08-01T00:00:00.000Z" }),
    ];

    const ordered = orderForListening(words);

    expect(ordered.map((item) => item.term)).toEqual(["wrong", "never", "correct"]);
  });

  it("틀린 것끼리는 많이 틀린 순서다", () => {
    const words = [
      word("few", { wrongCount: 1 }),
      word("many", { wrongCount: 9 }),
      word("some", { wrongCount: 4 }),
    ];

    expect(orderForListening(words).map((item) => item.term)).toEqual([
      "many",
      "some",
      "few",
    ]);
  });

  it("한 번도 안 본 것끼리는 중요도 높은 순서다", () => {
    const words = [
      word("rare", { importance: 1 }),
      word("core", { importance: 5 }),
      word("mid", { importance: 3 }),
    ];

    expect(orderForListening(words).map((item) => item.term)).toEqual([
      "core",
      "mid",
      "rare",
    ]);
  });

  it("맞혔던 것끼리는 복습할 때가 된 순서다", () => {
    const tested = "2026-08-01T00:00:00.000Z";
    const words = [
      word("later", { lastTestedAt: tested, nextReviewAt: "2026-09-01T00:00:00.000Z" }),
      word("sooner", { lastTestedAt: tested, nextReviewAt: "2026-08-15T00:00:00.000Z" }),
      word("noDate", { lastTestedAt: tested, nextReviewAt: null }),
    ];

    // 복습 시각이 없는 것은 맨 뒤로 민다
    expect(orderForListening(words).map((item) => item.term)).toEqual([
      "sooner",
      "later",
      "noDate",
    ]);
  });

  it("🚨 한 번도 시험 안 본 단어만 있어도 a 부터 시작하지 않는다", () => {
    // 첫 사용 때의 상황 — 기록이 하나도 없다.
    // 동점을 알파벳순으로 두면 중요도 5인 a 가 맨 앞으로 와 예전 문제가 그대로 돌아온다.
    const words = ["a", "and", "be", "of", "the", "to", "in", "that", "have", "it"].map(
      (term) => word(term, { importance: 5 }),
    );

    const ordered = orderForListening(words);

    expect(ordered[0].term).not.toBe("a");
    // 그래도 순서는 늘 같아야 한다(실행할 때마다 흔들리면 이어 듣기가 어긋난다)
    expect(orderForListening(words).map((item) => item.term)).toEqual(
      ordered.map((item) => item.term),
    );
  });

  it("원본 배열을 건드리지 않는다", () => {
    const words = [word("b", { wrongCount: 0 }), word("a", { wrongCount: 5 })];
    const copy = [...words];

    orderForListening(words);

    expect(words).toEqual(copy);
  });
});
