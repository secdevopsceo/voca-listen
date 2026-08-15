/**
 * 공부할 범위 테스트 (계획서 6-1)
 *
 * 세 화면(듣기·시험·단어장 목록)이 이 규칙 하나를 함께 쓴다.
 * 여기가 틀리면 화면마다 다른 단어가 나와 원인을 찾기 어려워진다.
 */

import type { Settings } from "@/lib/storage/_types";
import {
  filterByStudyRange,
  isInStudyRange,
  isWholeRange,
  studyRangeFromSettings,
} from "./study-range";

const WHOLE = {
  importanceMin: 1,
  importanceMax: 5,
  difficultyMin: 1,
  difficultyMax: 5,
};

function word(importance: number, difficulty: number) {
  return { importance, difficulty };
}

describe("isWholeRange", () => {
  it("1~5 전부면 참", () => {
    expect(isWholeRange(WHOLE)).toBe(true);
  });

  it("한 쪽만 좁혀도 거짓", () => {
    expect(isWholeRange({ ...WHOLE, importanceMin: 2 })).toBe(false);
    expect(isWholeRange({ ...WHOLE, difficultyMax: 4 })).toBe(false);
  });
});

describe("isInStudyRange", () => {
  it("중요도·난이도가 모두 범위 안이어야 든다", () => {
    const range = {
      importanceMin: 4,
      importanceMax: 5,
      difficultyMin: 1,
      difficultyMax: 2,
    };

    expect(isInStudyRange(word(5, 1), range)).toBe(true);
    // 중요도는 맞지만 난이도가 벗어난다
    expect(isInStudyRange(word(5, 3), range)).toBe(false);
    // 난이도는 맞지만 중요도가 벗어난다
    expect(isInStudyRange(word(3, 1), range)).toBe(false);
  });

  it("경계값도 범위 안으로 본다", () => {
    const range = {
      importanceMin: 2,
      importanceMax: 4,
      difficultyMin: 2,
      difficultyMax: 4,
    };
    expect(isInStudyRange(word(2, 2), range)).toBe(true);
    expect(isInStudyRange(word(4, 4), range)).toBe(true);
  });
});

describe("filterByStudyRange", () => {
  it("범위가 전부면 원본을 그대로 준다", () => {
    const words = [word(1, 1), word(5, 5)];
    expect(filterByStudyRange(words, WHOLE)).toBe(words);
  });

  it("🚨 직접 넣은 단어(중요도 3)는 범위를 좁히면 빠진다", () => {
    // 이 성질 때문에 화면에 안내 문구를 띄운다(인터뷰에서 요청받은 가이드)
    const mine = word(3, 3);
    const core = word(5, 1);

    const narrowed = filterByStudyRange([mine, core], {
      importanceMin: 4,
      importanceMax: 5,
      difficultyMin: 1,
      difficultyMax: 5,
    });

    expect(narrowed).toEqual([core]);
  });
});

describe("studyRangeFromSettings", () => {
  it("설정에 저장된 네 값을 그대로 옮긴다", () => {
    const settings = {
      studyImportanceMin: 2,
      studyImportanceMax: 5,
      studyDifficultyMin: 1,
      studyDifficultyMax: 3,
    } as Settings;

    expect(studyRangeFromSettings(settings)).toEqual({
      importanceMin: 2,
      importanceMax: 5,
      difficultyMin: 1,
      difficultyMax: 3,
    });
  });
});
