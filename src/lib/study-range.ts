/**
 * 공부할 범위 규칙
 *
 * 계획서 6-1 — 듣기 학습·시험·단어장 목록이 같은 규칙으로 단어를 거른다.
 * 화면마다 따로 계산하면 어긋나므로 여기 한 곳에 둔다.
 */

import type { Settings } from "@/lib/storage/_types";
import type { StudyRange } from "@/store/slice/uiSlice";

/** 중요도·난이도가 가질 수 있는 값 — 둘 다 숫자가 클수록 「더」다(5 가 가장 어렵고 가장 자주 쓴다) */
export const GRADE_LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * 등급의 종류.
 * 화면이 뜻 낱말(`grade.difficulty3` 등)과 안내 문구를 고를 때 쓴다.
 */
export type GradeKind = "difficulty" | "importance";

const MIN_GRADE = 1;
const MAX_GRADE = 5;

/** 설정에 저장된 기본값을 화면이 쓰는 범위로 바꾼다 */
export function studyRangeFromSettings(settings: Settings): StudyRange {
  return {
    importanceMin: settings.studyImportanceMin,
    importanceMax: settings.studyImportanceMax,
    difficultyMin: settings.studyDifficultyMin,
    difficultyMax: settings.studyDifficultyMax,
  };
}

/** 아무것도 걸러내지 않는 범위인가 (안내·되돌리기 버튼 표시에 쓴다) */
export function isWholeRange(range: StudyRange): boolean {
  return (
    range.importanceMin === MIN_GRADE &&
    range.importanceMax === MAX_GRADE &&
    range.difficultyMin === MIN_GRADE &&
    range.difficultyMax === MAX_GRADE
  );
}

/** 한 단어가 범위 안에 드는가 */
export function isInStudyRange(
  word: { importance: number; difficulty: number },
  range: StudyRange,
): boolean {
  return (
    word.importance >= range.importanceMin &&
    word.importance <= range.importanceMax &&
    word.difficulty >= range.difficultyMin &&
    word.difficulty <= range.difficultyMax
  );
}

/** 범위에 드는 단어만 남긴다 */
export function filterByStudyRange<T extends { importance: number; difficulty: number }>(
  words: T[],
  range: StudyRange,
): T[] {
  if (isWholeRange(range)) return words;
  return words.filter((word) => isInStudyRange(word, range));
}
