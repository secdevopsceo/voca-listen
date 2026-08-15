/**
 * 읽어줄 항목 만들기 (순수 계산)
 * 설정의 "읽는 범위" 에 따라 단어 / 뜻 / 예문 중 무엇을 읽을지 정한다.
 */

import type { LangCode, TtsReadScope } from "@/lib/storage/_types";
import { BCP47_BY_LANG, KOREAN_BCP47 } from "./voices";

/** 읽어줄 한 덩어리 */
export interface SpeakItem {
  text: string;
  /** 브라우저 언어 코드 — 뜻은 한국어라 ko-KR 로 읽는다 */
  bcp47: string;
  /** 무엇을 읽는 중인지 (화면에서 지금 읽는 줄을 표시할 때 쓴다) */
  part: "term" | "meaning" | "example" | "exampleMeaning";
}

interface SpeakSource {
  term: string;
  meaning: string;
  example: string;
  exampleMeaning: string;
}

/**
 * 단어 하나를 읽을 항목으로 바꾼다.
 * 비어 있는 칸은 건너뛴다(예문이 없는 단어에서 침묵이 생기지 않게).
 */
export function buildSpeakItems(
  word: SpeakSource,
  scope: TtsReadScope,
  lang: LangCode,
): SpeakItem[] {
  const foreign = BCP47_BY_LANG[lang];
  const items: SpeakItem[] = [];

  if (word.term.trim() !== "") {
    items.push({ text: word.term, bcp47: foreign, part: "term" });
  }

  if (scope === "term") return items;

  if (word.meaning.trim() !== "") {
    items.push({ text: word.meaning, bcp47: KOREAN_BCP47, part: "meaning" });
  }

  if (scope === "term_meaning") return items;

  if (word.example.trim() !== "") {
    items.push({ text: word.example, bcp47: foreign, part: "example" });
  }

  // 예문까지만 읽는 범위와 예문 뜻까지 읽는 범위를 나눈다
  if (scope === "term_meaning_example") return items;

  if (word.exampleMeaning.trim() !== "") {
    items.push({ text: word.exampleMeaning, bcp47: KOREAN_BCP47, part: "exampleMeaning" });
  }

  return items;
}
