/**
 * 초기화(점수만 지우기) 테스트
 *
 * 🚨 이 파일이 지키는 가장 중요한 약속은 하나다.
 * **초기화해도 단어와 단어장은 하나도 지워지지 않는다.**
 * (대표가 두 번 확인한 사항이라 실수로 뒤집히지 않게 테스트로 못 박는다.)
 */

import * as quizResultStorage from "@/lib/storage/quiz-results";
import * as recordStorage from "@/lib/storage/word-records";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { resetScores } from "./reset";

function seedSampleData() {
  const wordbook = wordbookStorage.insertWordbook({
    deletedAt: null,
    name: "글로비시 1500",
    lang: "en",
    isDefault: true,
    sortOrder: 1,
  });
  const custom = wordbookStorage.insertWordbook({
    deletedAt: null,
    name: "일본어 여행",
    lang: "ja",
    isDefault: false,
    sortOrder: 1,
  });

  const word1 = wordStorage.insertWord({
    deletedAt: null,
    wordbookId: wordbook.id,
    term: "abandon",
    meaning: "버리다",
    reading: "",
    example: "",
    exampleMeaning: "",
    partOfSpeech: "동사",
    difficulty: 2,
    importance: 3,
    memo: "",
    starred: true,
  });
  const word2 = wordStorage.insertWord({
    deletedAt: null,
    wordbookId: custom.id,
    term: "こんにちは",
    meaning: "안녕하세요",
    reading: "곤니치와",
    example: "",
    exampleMeaning: "",
    partOfSpeech: "",
    difficulty: 1,
    importance: 3,
    memo: "",
    starred: true,
  });

  recordStorage.insertWordRecord({
    deletedAt: null,
    wordId: word1.id,
    correctCount: 5,
    wrongCount: 2,
    unknownCount: 1,
    lastTestedAt: "2026-03-01T00:00:00.000Z",
    reviewStage: 3,
    nextReviewAt: "2026-03-08T00:00:00.000Z",
  });

  quizResultStorage.insertQuizResult({
    deletedAt: null,
    wordbookId: wordbook.id,
    mode: "see",
    totalCount: 10,
    correctCount: 7,
    wrongCount: 3,
    unknownCount: 1,
    finishedAt: "2026-03-01T00:00:00.000Z",
  });

  return { wordbook, custom, word1, word2 };
}

describe("resetScores", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("🚨 단어와 단어장은 하나도 지우지 않는다", () => {
    const { word1, word2, wordbook, custom } = seedSampleData();

    resetScores();

    const words = wordStorage.selectListWords();
    expect(words).toHaveLength(2);
    expect(words.map((word) => word.id).sort()).toEqual([word1.id, word2.id].sort());

    const wordbooks = wordbookStorage.selectListWordbooks();
    expect(wordbooks).toHaveLength(2);
    expect(wordbooks.map((book) => book.id).sort()).toEqual([wordbook.id, custom.id].sort());
  });

  it("🚨 단어의 뜻·발음 같은 내용도 그대로다(글로비시로 되돌리지 않는다)", () => {
    const { word2 } = seedSampleData();

    resetScores();

    const japanese = wordStorage.selectWord(word2.id);
    expect(japanese?.term).toBe("こんにちは");
    expect(japanese?.meaning).toBe("안녕하세요");
    expect(japanese?.reading).toBe("곤니치와");
  });

  it("시험 기록을 전부 지운다", () => {
    seedSampleData();

    resetScores();

    expect(quizResultStorage.selectListQuizResults()).toHaveLength(0);
  });

  it("학습 기록을 전부 지워 모든 단어가 아직 안 본 상태가 된다", () => {
    const { word1 } = seedSampleData();

    resetScores();

    expect(recordStorage.selectListWordRecords()).toHaveLength(0);
    expect(recordStorage.selectWordRecord(word1.id)).toBeNull();
  });

  it("별표를 전부 끈다", () => {
    seedSampleData();

    resetScores();

    const starred = wordStorage.selectListWords().filter((word) => word.starred);
    expect(starred).toHaveLength(0);
  });

  it("휴지통에 있는 단어의 별표도 함께 끈다(되살렸을 때 남지 않게)", () => {
    const { wordbook } = seedSampleData();
    const trashed = wordStorage.insertWord({
      deletedAt: "2026-03-02T00:00:00.000Z",
      wordbookId: wordbook.id,
      term: "trashed",
      meaning: "버려진",
      reading: "",
      example: "",
      exampleMeaning: "",
      partOfSpeech: "",
      difficulty: 1,
      importance: 3,
      memo: "",
      starred: true,
    });

    resetScores();

    expect(wordStorage.selectWord(trashed.id)?.starred).toBe(false);
    // 휴지통에 있다는 사실 자체는 바뀌지 않는다
    expect(wordStorage.selectWord(trashed.id)?.deletedAt).toBe("2026-03-02T00:00:00.000Z");
  });

  it("무엇이 지워지고 무엇이 남았는지 숫자로 알려준다", () => {
    seedSampleData();

    const result = resetScores();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.deletedQuizResultCount).toBe(1);
    expect(result.data.deletedWordRecordCount).toBe(1);
    expect(result.data.unstarredWordCount).toBe(2);
    expect(result.data.keptWordCount).toBe(2);
    expect(result.data.keptWordbookCount).toBe(2);
  });

  it("아무 기록도 없을 때 실행해도 문제가 없다", () => {
    const result = resetScores();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.deletedQuizResultCount).toBe(0);
    expect(result.data.keptWordCount).toBe(0);
  });
});
