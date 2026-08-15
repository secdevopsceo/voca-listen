/**
 * 통계 집계 테스트 (읽기 전용 — 데이터를 바꾸지 않는다)
 */

import * as quizResultStorage from "@/lib/storage/quiz-results";
import * as recordStorage from "@/lib/storage/word-records";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { MAX_REVIEW_STAGE } from "./review";
import { countUntestedWords, getStats, listDueWords, listWeakWords } from "./stats";

const NOW = "2026-03-10T00:00:00.000Z";

function seed() {
  const wordbook = wordbookStorage.insertWordbook({
    deletedAt: null,
    name: "테스트",
    lang: "en",
    isDefault: true,
    sortOrder: 1,
  });

  const words = wordStorage.insertWords(
    ["alpha", "bravo", "charlie"].map((term, index) => ({
      deletedAt: null,
      wordbookId: wordbook.id,
      term,
      meaning: `뜻${index}`,
      reading: "",
      example: "",
      exampleMeaning: "",
      partOfSpeech: "",
      difficulty: 1,
      importance: 3,
      memo: "",
      starred: index === 0,
    })),
  );

  // alpha — 다 외운 단어, 복습 시기 아직
  recordStorage.insertWordRecord({
    deletedAt: null,
    wordId: words[0].id,
    correctCount: 8,
    wrongCount: 0,
    unknownCount: 0,
    lastTestedAt: "2026-03-01T00:00:00.000Z",
    reviewStage: MAX_REVIEW_STAGE,
    nextReviewAt: "2026-03-31T00:00:00.000Z",
  });

  // bravo — 많이 틀린 단어, 복습 시기 지남
  recordStorage.insertWordRecord({
    deletedAt: null,
    wordId: words[1].id,
    correctCount: 1,
    wrongCount: 4,
    unknownCount: 2,
    lastTestedAt: "2026-03-05T00:00:00.000Z",
    reviewStage: 1,
    nextReviewAt: "2026-03-06T00:00:00.000Z",
  });

  // charlie — 아직 한 번도 안 본 단어(기록 없음)

  quizResultStorage.insertQuizResult({
    deletedAt: null,
    wordbookId: wordbook.id,
    mode: "see",
    totalCount: 10,
    correctCount: 9,
    wrongCount: 1,
    unknownCount: 0,
    finishedAt: "2026-03-09T04:00:00.000Z",
  });

  return { wordbook, words };
}

describe("getStats", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("요약 숫자를 센다", () => {
    seed();

    const { summary } = getStats(NOW);

    expect(summary.totalWordCount).toBe(3);
    expect(summary.testedWordCount).toBe(2);
    expect(summary.masteredWordCount).toBe(1);
    expect(summary.dueWordCount).toBe(1);
    expect(summary.quizCount).toBe(1);
  });

  it("전체 정답률을 맞힌 수 기준으로 낸다", () => {
    seed();

    const { summary } = getStats(NOW);

    // 맞힘 9(8+1) / 전체 13(9+4)
    expect(summary.totalCorrectCount).toBe(9);
    expect(summary.totalWrongCount).toBe(4);
    expect(summary.overallAccuracy).toBe(69);
  });

  it("「모른다」 횟수를 따로 센다", () => {
    seed();

    expect(getStats(NOW).summary.totalUnknownCount).toBe(2);
  });

  it("오답 노트는 틀린 적 있는 단어만 담는다", () => {
    seed();

    const { weakWords } = getStats(NOW);

    expect(weakWords).toHaveLength(1);
    expect(weakWords[0].term).toBe("bravo");
  });

  it("별표한 단어를 따로 모은다", () => {
    seed();

    const { starredWords } = getStats(NOW);

    expect(starredWords).toHaveLength(1);
    expect(starredWords[0].term).toBe("alpha");
  });

  it("날짜별 정답률을 하루 단위로 묶는다", () => {
    seed();

    const { dailyScores } = getStats(NOW);

    expect(dailyScores).toHaveLength(1);
    expect(dailyScores[0].accuracy).toBe(90);
    expect(dailyScores[0].totalCount).toBe(10);
  });

  it("아무 데이터가 없어도 0 으로 답한다(0 으로 나누지 않는다)", () => {
    const { summary, dailyScores } = getStats(NOW);

    expect(summary.totalWordCount).toBe(0);
    expect(summary.overallAccuracy).toBe(0);
    expect(dailyScores).toHaveLength(0);
  });

  it("저장공간 사용량을 함께 준다", () => {
    seed();

    const { storage } = getStats(NOW);

    expect(storage.usedBytes).toBeGreaterThan(0);
    expect(storage.ratio).toBeGreaterThan(0);
    expect(storage.isNearFull).toBe(false);
  });
});

describe("목록 조회", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("오늘 복습할 단어만 고른다", () => {
    seed();

    const due = listDueWords(NOW);

    expect(due).toHaveLength(1);
    expect(due[0].term).toBe("bravo");
  });

  it("틀린 횟수가 많은 순으로 오답 노트를 준다", () => {
    seed();

    expect(listWeakWords()[0].term).toBe("bravo");
  });

  it("아직 안 본 단어 수를 센다", () => {
    seed();

    expect(countUntestedWords()).toBe(1);
  });
});
