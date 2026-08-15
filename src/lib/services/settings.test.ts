/**
 * 설정 테스트 (계획서 행위 14 — 설정 바꾸기)
 * 범위를 벗어난 값이 들어와도 쓸 수 있는 값으로 맞춰지는지 본다.
 */

import {
  TTS_GAP_MAX_MS,
  TTS_RATE_MAX,
  TTS_RATE_MIN,
  TTS_REPEAT_MAX,
  getSettings,
  saveSettings,
} from "./settings";

describe("설정", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("아직 저장한 적이 없으면 기본값을 준다", () => {
    const settings = getSettings();

    expect(settings.ttsRate).toBe(1);
    expect(settings.ttsGender).toBe("female");
    // 예문 뜻까지 읽는 것이 기본이다(단어 → 뜻 → 예문 → 예문 뜻)
    expect(settings.ttsReadScope).toBe("term_meaning_example_meaning");
    expect(settings.ttsRepeat).toBe(1);
    expect(settings.ttsGapMs).toBe(800);
  });

  it("바꾼 값이 저장된다", () => {
    saveSettings({ ttsRate: 1.4, ttsGender: "male", ttsReadScope: "term_meaning_example" });

    const settings = getSettings();
    expect(settings.ttsRate).toBe(1.4);
    expect(settings.ttsGender).toBe("male");
    expect(settings.ttsReadScope).toBe("term_meaning_example");
  });

  it("바꾸지 않은 값은 그대로 둔다", () => {
    saveSettings({ ttsRate: 1.4 });
    saveSettings({ ttsGender: "male" });

    const settings = getSettings();
    expect(settings.ttsRate).toBe(1.4);
    expect(settings.ttsGender).toBe("male");
  });

  it("읽기 속도가 범위를 벗어나면 허용 범위로 맞춘다", () => {
    expect(saveSettings({ ttsRate: 99 }).ok).toBe(true);
    expect(getSettings().ttsRate).toBe(TTS_RATE_MAX);

    saveSettings({ ttsRate: 0.01 });
    expect(getSettings().ttsRate).toBe(TTS_RATE_MIN);
  });

  it("반복 횟수와 간격도 범위 안으로 맞춘다", () => {
    saveSettings({ ttsRepeat: 100, ttsGapMs: 999999 });

    const settings = getSettings();
    expect(settings.ttsRepeat).toBe(TTS_REPEAT_MAX);
    expect(settings.ttsGapMs).toBe(TTS_GAP_MAX_MS);
  });

  it("숫자가 아닌 값이 들어와도 앱이 죽지 않는다", () => {
    saveSettings({ ttsRate: Number.NaN });

    expect(getSettings().ttsRate).toBe(TTS_RATE_MIN);
  });

  it("반복 횟수는 정수로 저장된다", () => {
    saveSettings({ ttsRepeat: 2.7 });

    expect(Number.isInteger(getSettings().ttsRepeat)).toBe(true);
  });
});

describe("공부할 범위 (계획서 행위 6)", () => {
  it("네 값을 그대로 저장한다", () => {
    const saved = saveSettings({
      studyImportanceMin: 3,
      studyImportanceMax: 5,
      studyDifficultyMin: 1,
      studyDifficultyMax: 2,
    });

    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.data.studyImportanceMin).toBe(3);
    expect(saved.data.studyImportanceMax).toBe(5);
    expect(saved.data.studyDifficultyMin).toBe(1);
    expect(saved.data.studyDifficultyMax).toBe(2);
  });

  it("🚨 최솟값이 최댓값보다 크면 맞바꿔 저장한다", () => {
    const saved = saveSettings({ studyImportanceMin: 5, studyImportanceMax: 2 });

    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    // 뒤집힌 채로 저장되면 아무 단어도 범위에 들지 않아 화면이 텅 빈다
    expect(saved.data.studyImportanceMin).toBe(2);
    expect(saved.data.studyImportanceMax).toBe(5);
  });
});
