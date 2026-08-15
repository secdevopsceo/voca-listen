/**
 * 글로비시 단어장을 품사로 나눌 때 쓰는 순서·이름 규칙
 *
 * 계획서 4-1·4-2 — 목록에 늘어놓는 순서는 문법책 순서다.
 * 이 배열의 자리(1부터)가 그대로 단어장의 sortOrder 가 된다.
 */

/** 문법책 순서 */
export const PART_OF_SPEECH_ORDER = [
  "명사",
  "대명사",
  "동사",
  "조동사",
  "형용사",
  "부사",
  "전치사",
  "전치사구",
  "접속사",
  "관사",
] as const;

/** 단어장 이름 앞에 붙이는 출처 — 내가 만든 단어장과 구별하려고 붙인다 */
export const GLOBISH_PREFIX = "글로비시";

/** 품사로 글로비시 단어장 이름을 만든다 (예: "글로비시 · 명사") */
export function globishWordbookName(partOfSpeech: string): string {
  return `${GLOBISH_PREFIX} · ${partOfSpeech}`;
}

/**
 * 품사를 문법책 순서대로 늘어놓는다.
 * 표에 없는 품사가 섞여 있어도 버리지 않고 뒤에 가나다순으로 붙인다(단어가 사라지지 않게).
 */
export function sortPartsOfSpeech(parts: string[]): string[] {
  const known = PART_OF_SPEECH_ORDER as readonly string[];
  const rank = (part: string) => {
    const index = known.indexOf(part);
    return index === -1 ? known.length : index;
  };
  return [...parts].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "ko"));
}
