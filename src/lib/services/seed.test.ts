/**
 * 첫 실행 시드 테스트 (계획서 행위 1 — 1회성 작업)
 * 1500단어를 매번 불러오면 느리므로 시드 데이터 로더를 흉내 낸다.
 */

import * as metaStorage from "@/lib/storage/meta";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { seedIfNeeded } from "./seed";

jest.mock("@/lib/seed", () => ({
  loadGlobishSeed: jest.fn(async () => [
    {
      term: "abandon",
      meaning: "버리다, 포기하다",
      partOfSpeech: "동사",
      difficulty: 2,
      importance: 3,
      example: "They had to abandon the car.",
      exampleMeaning: "그들은 차를 버려야 했다.",
    },
    {
      term: "able",
      meaning: "~할 수 있는",
      partOfSpeech: "형용사",
      difficulty: 1,
      importance: 3,
      example: "She is able to swim.",
      exampleMeaning: "그녀는 수영할 수 있다.",
    },
  ]),
}));

describe("seedIfNeeded", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("🚨 처음 열면 품사별 단어장으로 나눠 넣는다", async () => {
    const result = await seedIfNeeded();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.seeded).toBe(true);
    expect(result.data.insertedWordCount).toBe(2);
    // 흉내 낸 시드에 동사·형용사가 하나씩이라 단어장도 2개가 된다
    expect(result.data.wordbookCount).toBe(2);

    const wordbooks = wordbookStorage.selectListWordbooks();
    expect(wordbooks.map((book) => book.name)).toEqual([
      "글로비시 · 동사",
      "글로비시 · 형용사",
    ]);
    // 문법책 순서(동사 → 형용사)대로 sortOrder 가 붙는다
    expect(wordbooks.map((book) => book.sortOrder)).toEqual([1, 2]);
    expect(wordbooks.every((book) => book.lang === "en")).toBe(true);
    // 10개 모두 지울 수 없다(계획서 4-1)
    expect(wordbooks.every((book) => book.isDefault)).toBe(true);
  });

  it("단어에 뜻·품사·난이도·예문이 함께 들어간다", async () => {
    await seedIfNeeded();

    const word = wordStorage.selectListWords().find((w) => w.term === "abandon");
    expect(word?.meaning).toBe("버리다, 포기하다");
    expect(word?.partOfSpeech).toBe("동사");
    expect(word?.difficulty).toBe(2);
    expect(word?.example).toBe("They had to abandon the car.");
    expect(word?.exampleMeaning).toBe("그들은 차를 버려야 했다.");
    // 시드 단어는 발음·메모가 비어 있고 별표도 꺼져 있다
    expect(word?.reading).toBe("");
    expect(word?.memo).toBe("");
    expect(word?.starred).toBe(false);
    expect(word?.deletedAt).toBeNull();
  });

  it("넣었다는 표시를 남긴다", async () => {
    await seedIfNeeded();

    const meta = metaStorage.selectMeta();
    expect(meta.seededAt).not.toBeNull();
    expect(meta.seedVersion).toBeGreaterThanOrEqual(1);
  });

  it("🚨 두 번째로 열어도 단어가 두 벌이 되지 않는다", async () => {
    await seedIfNeeded();
    const secondRun = await seedIfNeeded();

    expect(secondRun.ok).toBe(true);
    if (!secondRun.ok) return;
    expect(secondRun.data.seeded).toBe(false);
    expect(secondRun.data.insertedWordCount).toBe(0);
    expect(wordStorage.selectListWords()).toHaveLength(2);
  });

  it("표시만 지워졌어도 기본 단어장이 있으면 다시 넣지 않는다", async () => {
    await seedIfNeeded();
    // 시드 표시만 사라진 상황을 만든다
    window.localStorage.removeItem("voca-listen:meta");

    const result = await seedIfNeeded();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.seeded).toBe(false);
    expect(wordStorage.selectListWords()).toHaveLength(2);
    // 표시는 다시 남겨둔다
    expect(metaStorage.selectMeta().seededAt).not.toBeNull();
  });
});
