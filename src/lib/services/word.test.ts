/**
 * 단어 규칙 테스트
 * 계획서 행위 5(추가·중복 분기) · 6(수정) · 7(휴지통) · 8(되살리기) · 9(비우기) · 10(별표)
 */

import * as recordStorage from "@/lib/storage/word-records";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import {
  addWord,
  editWord,
  emptyTrash,
  listWords,
  restoreWord,
  toggleStar,
  trashWord,
} from "./word";

function makeWordbook(name = "테스트 단어장", isDefault = false) {
  return wordbookStorage.insertWordbook({
    deletedAt: null,
    name,
    lang: "ja",
    isDefault,
    sortOrder: 1,
  });
}

const BASE_INPUT = {
  term: "ねこ",
  meaning: "고양이",
  reading: "네코",
  example: "ねこがすきです。",
  exampleMeaning: "고양이를 좋아합니다.",
  partOfSpeech: "명사",
  difficulty: 2,
  importance: 3,
  memo: "",
};

describe("addWord", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("새 단어를 넣는다", () => {
    const wordbook = makeWordbook();

    const result = addWord({ ...BASE_INPUT, wordbookId: wordbook.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.kind).toBe("created");
    expect(wordStorage.selectListWords()).toHaveLength(1);
  });

  it("단어나 뜻이 비면 넣지 않는다", () => {
    const wordbook = makeWordbook();

    const empty = addWord({ ...BASE_INPUT, term: "  ", wordbookId: wordbook.id });

    expect(empty.ok).toBe(false);
    expect(wordStorage.selectListWords()).toHaveLength(0);
  });

  it("같은 단어가 있으면 바로 넣지 않고 물어본다", () => {
    const wordbook = makeWordbook();
    addWord({ ...BASE_INPUT, wordbookId: wordbook.id });

    const result = addWord({ ...BASE_INPUT, meaning: "고양이(동물)", wordbookId: wordbook.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.kind).toBe("duplicated");
    // 물어보는 단계에서는 아직 아무것도 안 바뀐다
    expect(wordStorage.selectListWords()).toHaveLength(1);
    expect(wordStorage.selectListWords()[0].meaning).toBe("고양이");
  });

  it("「뜻 고치기」를 고르면 새 행을 만들지 않고 기존 행을 고친다", () => {
    const wordbook = makeWordbook();
    addWord({ ...BASE_INPUT, wordbookId: wordbook.id });

    const result = addWord(
      { ...BASE_INPUT, meaning: "고양이(동물)", wordbookId: wordbook.id },
      "edit",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.kind).toBe("updated");
    expect(wordStorage.selectListWords()).toHaveLength(1);
    expect(wordStorage.selectListWords()[0].meaning).toBe("고양이(동물)");
  });

  it("「새로 추가」를 고르면 같은 단어가 두 행이 된다", () => {
    const wordbook = makeWordbook();
    addWord({ ...BASE_INPUT, wordbookId: wordbook.id });

    const result = addWord(
      { ...BASE_INPUT, meaning: "고양이(동물)", wordbookId: wordbook.id },
      "addNew",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.kind).toBe("created");
    expect(wordStorage.selectListWords()).toHaveLength(2);
  });

  it("대소문자만 다른 단어도 같은 단어로 본다", () => {
    const wordbook = makeWordbook();
    addWord({ ...BASE_INPUT, term: "Cat", wordbookId: wordbook.id });

    const result = addWord({ ...BASE_INPUT, term: "cat", wordbookId: wordbook.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.kind).toBe("duplicated");
  });

  it("다른 단어장에 같은 단어가 있는 것은 중복이 아니다", () => {
    const first = makeWordbook("첫 단어장");
    const second = makeWordbook("둘째 단어장");
    addWord({ ...BASE_INPUT, wordbookId: first.id });

    const result = addWord({ ...BASE_INPUT, wordbookId: second.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.kind).toBe("created");
  });

  it("휴지통에 있는 단어장에는 넣을 수 없다", () => {
    const wordbook = makeWordbook();
    wordbookStorage.updateWordbook(wordbook.id, { deletedAt: "2026-03-01T00:00:00.000Z" });

    const result = addWord({ ...BASE_INPUT, wordbookId: wordbook.id });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("wordbookInTrash");
  });
});

describe("editWord", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("고쳐도 학습 기록은 건드리지 않는다", () => {
    const wordbook = makeWordbook();
    const added = addWord({ ...BASE_INPUT, wordbookId: wordbook.id });
    if (!added.ok || added.data.kind !== "created") throw new Error("setup failed");
    const wordId = added.data.word.id;

    recordStorage.insertWordRecord({
      deletedAt: null,
      wordId,
      correctCount: 4,
      wrongCount: 1,
      unknownCount: 0,
      lastTestedAt: "2026-03-01T00:00:00.000Z",
      reviewStage: 3,
      nextReviewAt: "2026-03-08T00:00:00.000Z",
    });

    editWord(wordId, { ...BASE_INPUT, meaning: "고양이과 동물" });

    const record = recordStorage.selectWordRecord(wordId);
    expect(record?.correctCount).toBe(4);
    expect(record?.reviewStage).toBe(3);
    expect(wordStorage.selectWord(wordId)?.meaning).toBe("고양이과 동물");
  });
});

describe("휴지통", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("단어를 지우면 목록에서 빠지지만 행은 남는다(표시만 삭제)", () => {
    const wordbook = makeWordbook();
    const added = addWord({ ...BASE_INPUT, wordbookId: wordbook.id });
    if (!added.ok || added.data.kind !== "created") throw new Error("setup failed");

    trashWord(added.data.word.id);

    expect(listWords()).toHaveLength(0);
    expect(wordStorage.selectWord(added.data.word.id)?.deletedAt).not.toBeNull();
  });

  it("지워도 학습 기록은 남아, 되살리면 정답률이 돌아온다", () => {
    const wordbook = makeWordbook();
    const added = addWord({ ...BASE_INPUT, wordbookId: wordbook.id });
    if (!added.ok || added.data.kind !== "created") throw new Error("setup failed");
    const wordId = added.data.word.id;

    recordStorage.insertWordRecord({
      deletedAt: null,
      wordId,
      correctCount: 3,
      wrongCount: 1,
      unknownCount: 0,
      lastTestedAt: "2026-03-01T00:00:00.000Z",
      reviewStage: 2,
      nextReviewAt: "2026-03-04T00:00:00.000Z",
    });

    trashWord(wordId);
    expect(recordStorage.selectWordRecord(wordId)?.correctCount).toBe(3);

    restoreWord(wordId);

    const restored = listWords();
    expect(restored).toHaveLength(1);
    expect(restored[0].correctCount).toBe(3);
    expect(restored[0].accuracy).toBe(75);
  });

  it("단어장이 휴지통에 있으면 단어를 되살릴 수 없다", () => {
    const wordbook = makeWordbook();
    const added = addWord({ ...BASE_INPUT, wordbookId: wordbook.id });
    if (!added.ok || added.data.kind !== "created") throw new Error("setup failed");

    trashWord(added.data.word.id);
    wordbookStorage.updateWordbook(wordbook.id, { deletedAt: "2026-03-01T00:00:00.000Z" });

    const result = restoreWord(added.data.word.id);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("wordbookInTrash");
  });

  it("휴지통을 비우면 단어·단어장·학습 기록이 함께 사라진다", () => {
    const wordbook = makeWordbook();
    const added = addWord({ ...BASE_INPUT, wordbookId: wordbook.id });
    if (!added.ok || added.data.kind !== "created") throw new Error("setup failed");
    const wordId = added.data.word.id;

    recordStorage.insertWordRecord({
      deletedAt: null,
      wordId,
      correctCount: 1,
      wrongCount: 0,
      unknownCount: 0,
      lastTestedAt: null,
      reviewStage: 1,
      nextReviewAt: null,
    });

    trashWord(wordId);
    wordbookStorage.updateWordbook(wordbook.id, { deletedAt: "2026-03-01T00:00:00.000Z" });

    const result = emptyTrash();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.deletedWordCount).toBe(1);
    expect(result.data.deletedWordbookCount).toBe(1);
    expect(result.data.deletedRecordCount).toBe(1);
    expect(wordStorage.selectWord(wordId)).toBeNull();
    expect(recordStorage.selectWordRecord(wordId)).toBeNull();
  });

  it("휴지통을 비워도 지우지 않은 단어는 그대로 있다", () => {
    const wordbook = makeWordbook();
    const keep = addWord({ ...BASE_INPUT, term: "いぬ", wordbookId: wordbook.id });
    const drop = addWord({ ...BASE_INPUT, term: "ねこ", wordbookId: wordbook.id });
    if (!keep.ok || keep.data.kind !== "created") throw new Error("setup failed");
    if (!drop.ok || drop.data.kind !== "created") throw new Error("setup failed");

    trashWord(drop.data.word.id);
    emptyTrash();

    expect(wordStorage.selectListWords()).toHaveLength(1);
    expect(wordStorage.selectWord(keep.data.word.id)).not.toBeNull();
  });
});

describe("toggleStar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("누를 때마다 반대로 바뀐다", () => {
    const wordbook = makeWordbook();
    const added = addWord({ ...BASE_INPUT, wordbookId: wordbook.id });
    if (!added.ok || added.data.kind !== "created") throw new Error("setup failed");
    const wordId = added.data.word.id;

    toggleStar(wordId);
    expect(wordStorage.selectWord(wordId)?.starred).toBe(true);

    toggleStar(wordId);
    expect(wordStorage.selectWord(wordId)?.starred).toBe(false);
  });
});
