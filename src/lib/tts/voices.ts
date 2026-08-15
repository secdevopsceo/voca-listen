/**
 * 언어별 음성 고르기 규칙 (순수 계산 — 브라우저 API 없이 테스트할 수 있다)
 *
 * init-dev 의 useTTS 는 영어 음성 이름만 알고 있어서 일본어·프랑스어에는 통하지 않았다.
 * 이 맥에 실제로 깔린 음성을 확인해 언어별 이름을 넣고, 못 찾을 때를 대비해
 * macOS 가 모든 언어에 공통으로 주는 음성 계열(Flo·Sandy·Reed·Rocko 등)을 뒤에 둔다.
 */

import type { LangCode } from "@/lib/storage/_types";
import type { TtsGender } from "@/lib/storage/_types";

/** 단어장 언어 → 브라우저가 쓰는 언어 코드 */
export const BCP47_BY_LANG: Record<LangCode, string> = {
  en: "en-US",
  ja: "ja-JP",
  fr: "fr-FR",
};

/** 한국어 뜻을 읽어줄 때 쓰는 언어 코드 */
export const KOREAN_BCP47 = "ko-KR";

/** 음성 이름은 브라우저마다 대소문자가 달라 전부 소문자로 견준다 */
const VOICE_NAME_HINTS: Record<string, Record<TtsGender, string[]>> = {
  en: {
    female: [
      "samantha",
      "karen",
      "victoria",
      "google us english",
      "google uk english female",
      "moira",
      "tessa",
      "fiona",
    ],
    male: ["daniel", "alex", "google uk english male", "fred", "tom", "rishi"],
  },
  ja: {
    female: ["kyoko", "google 日本語", "o-ren"],
    male: ["otoya", "hattori"],
  },
  fr: {
    female: ["amélie", "amelie", "audrey", "google français", "marie"],
    male: ["thomas", "jacques", "nicolas"],
  },
  ko: {
    female: ["유나", "yuna", "google 한국의"],
    male: ["minsu"],
  },
};

/**
 * macOS 가 여러 언어에 공통으로 주는 음성 계열.
 * 언어별 이름으로 못 찾았을 때 쓴다(같은 이름의 언어별 변형이 있다).
 */
const SHARED_FAMILY_HINTS: Record<TtsGender, string[]> = {
  female: ["flo", "sandy", "shelley", "grandma"],
  male: ["eddy", "reed", "rocko", "grandpa"],
};

/** 음성 목록에서 언어·성별에 맞는 것을 고른다. 못 찾으면 null */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  bcp47: string,
  gender: TtsGender,
): SpeechSynthesisVoice | null {
  const primary = bcp47.split("-")[0].toLowerCase();

  // 같은 언어의 음성만 남긴다
  const sameLang = voices.filter((voice) =>
    voice.lang.toLowerCase().replace("_", "-").startsWith(primary),
  );
  if (sameLang.length === 0) return null;

  const hints = VOICE_NAME_HINTS[primary]?.[gender] ?? [];
  for (const hint of hints) {
    const found = sameLang.find((voice) => voice.name.toLowerCase().includes(hint));
    if (found !== undefined) return found;
  }

  for (const hint of SHARED_FAMILY_HINTS[gender]) {
    const found = sameLang.find((voice) => voice.name.toLowerCase().includes(hint));
    if (found !== undefined) return found;
  }

  // 그래도 못 찾으면 같은 언어의 첫 음성 — 언어만 맞으면 발음은 통한다
  return sameLang[0];
}

/** 그 언어를 읽어줄 음성이 하나라도 있는지 */
export function hasVoiceForLang(voices: SpeechSynthesisVoice[], bcp47: string): boolean {
  const primary = bcp47.split("-")[0].toLowerCase();
  return voices.some((voice) =>
    voice.lang.toLowerCase().replace("_", "-").startsWith(primary),
  );
}
