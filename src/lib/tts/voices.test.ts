/**
 * 언어별 음성 고르기 테스트
 *
 * init-dev 의 원본 훅은 영어 음성 이름만 알아서 일본어·프랑스어에 통하지 않았다.
 * 그 문제가 되돌아오지 않게 언어마다 확인한다.
 * (실제 맥에 깔린 음성 목록을 브라우저에서 확인해 표본으로 삼았다.)
 */

import { BCP47_BY_LANG, KOREAN_BCP47, hasVoiceForLang, pickVoice } from "./voices";

/** SpeechSynthesisVoice 흉내 — 이름과 언어만 있으면 된다 */
function voice(name: string, lang: string): SpeechSynthesisVoice {
  return {
    name,
    lang,
    default: false,
    localService: true,
    voiceURI: name,
  } as SpeechSynthesisVoice;
}

/** 이 맥에서 실제로 확인한 음성들의 일부 */
const VOICES = [
  voice("Samantha", "en-US"),
  voice("Daniel", "en-GB"),
  voice("Karen", "en-AU"),
  voice("Kyoko", "ja-JP"),
  voice("Google 日本語", "ja-JP"),
  voice("Amélie", "fr-CA"),
  voice("Thomas", "fr-FR"),
  voice("유나", "ko-KR"),
  voice("Flo (일본어(일본))", "ja-JP"),
  voice("Rocko (프랑스어(프랑스))", "fr-FR"),
];

describe("BCP47_BY_LANG", () => {
  it("단어장 언어를 브라우저 언어 코드로 바꾼다", () => {
    expect(BCP47_BY_LANG.en).toBe("en-US");
    expect(BCP47_BY_LANG.ja).toBe("ja-JP");
    expect(BCP47_BY_LANG.fr).toBe("fr-FR");
    expect(KOREAN_BCP47).toBe("ko-KR");
  });
});

describe("pickVoice", () => {
  it("영어 여성 음성을 고른다", () => {
    expect(pickVoice(VOICES, "en-US", "female")?.name).toBe("Samantha");
  });

  it("영어 남성 음성을 고른다", () => {
    expect(pickVoice(VOICES, "en-US", "male")?.name).toBe("Daniel");
  });

  it("🚨 일본어 여성 음성을 고른다(원본 훅이 못 하던 것)", () => {
    expect(pickVoice(VOICES, "ja-JP", "female")?.name).toBe("Kyoko");
  });

  it("🚨 프랑스어 여성·남성 음성을 고른다", () => {
    expect(pickVoice(VOICES, "fr-FR", "female")?.name).toBe("Amélie");
    expect(pickVoice(VOICES, "fr-FR", "male")?.name).toBe("Thomas");
  });

  it("한국어 음성을 고른다(뜻을 읽어줄 때 쓴다)", () => {
    expect(pickVoice(VOICES, "ko-KR", "female")?.name).toBe("유나");
  });

  it("나라가 달라도 같은 언어면 고른다(fr-FR 요청에 fr-CA 도 후보)", () => {
    const onlyCanadian = [voice("Amélie", "fr-CA")];
    expect(pickVoice(onlyCanadian, "fr-FR", "female")?.name).toBe("Amélie");
  });

  it("이름으로 못 찾으면 macOS 공통 음성 계열로 넘어간다", () => {
    const noNamedVoice = [voice("Flo (일본어(일본))", "ja-JP")];
    expect(pickVoice(noNamedVoice, "ja-JP", "female")?.name).toBe("Flo (일본어(일본))");
  });

  it("아무 이름도 못 맞히면 그 언어의 첫 음성을 쓴다", () => {
    const unknown = [voice("SomeUnknownVoice", "ja-JP")];
    expect(pickVoice(unknown, "ja-JP", "female")?.name).toBe("SomeUnknownVoice");
  });

  it("그 언어 음성이 하나도 없으면 null 을 준다", () => {
    expect(pickVoice(VOICES, "de-DE", "female")).toBeNull();
  });

  it("언어 코드에 밑줄을 써도 알아본다", () => {
    const underscore = [voice("Kyoko", "ja_JP")];
    expect(pickVoice(underscore, "ja-JP", "female")?.name).toBe("Kyoko");
  });
});

describe("hasVoiceForLang", () => {
  it("그 언어를 읽을 수 있는지 알려준다", () => {
    expect(hasVoiceForLang(VOICES, "ja-JP")).toBe(true);
    expect(hasVoiceForLang(VOICES, "de-DE")).toBe(false);
  });
});
