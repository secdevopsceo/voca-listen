/**
 * 설정 저장소 (1행)
 * 함수명 prefix 는 select / selectList / insert / update / delete 5종만 쓴다.
 */

import { nowIso, readJson, writeJson } from "./_client";
import { STORAGE_KEYS } from "./_keys";
import type { Settings } from "./_types";

export type SettingsPatch = Partial<Omit<Settings, "id" | "createdAt" | "updatedAt">>;

/** 설정 기본값 — 계획서 "남은 가정" 의 자동 재생 1회·800밀리초를 따른다 */
export const DEFAULT_SETTINGS: Omit<Settings, "createdAt" | "updatedAt"> = {
  id: 1,
  ttsRate: 1,
  ttsGender: "female",
  // 듣기 학습은 단어 → 뜻 → 예문 → 예문 뜻 순으로 읽고 다음 카드로 넘어간다.
  // 예문까지 들어야 그 단어가 문장에서 어떻게 쓰이는지 귀에 남는다.
  ttsReadScope: "term_meaning_example_meaning",
  ttsRepeat: 1,
  ttsGapMs: 800,
  uiLocale: "ko",
  theme: "system",
  // 공부할 범위 기본값 — 처음에는 전부 공부한다
  studyImportanceMin: 1,
  studyImportanceMax: 5,
  studyDifficultyMin: 1,
  studyDifficultyMax: 5,
};

/** 설정 읽기 — 아직 저장된 적이 없으면 기본값을 돌려준다(저장하지는 않는다) */
export function selectSettings(): Settings {
  const now = nowIso();
  const fallback: Settings = { ...DEFAULT_SETTINGS, createdAt: now, updatedAt: now };
  const stored = readJson<Settings | null>(STORAGE_KEYS.settings, null);
  if (stored === null) return fallback;
  // 낡은 저장분에 새 항목이 없을 수 있으므로 기본값 위에 덮어 읽는다
  return { ...fallback, ...stored, id: 1 };
}

/** 설정 고치기 — 저장된 적이 없으면 기본값으로 만든 뒤 고친다 */
export function updateSettings(patch: SettingsPatch): Settings {
  const current = selectSettings();
  const next: Settings = { ...current, ...patch, id: 1, updatedAt: nowIso() };
  writeJson(STORAGE_KEYS.settings, next);
  return next;
}

/** 설정을 통째로 바꾼다 — 가져오기에서만 쓴다 */
export function updateAllSettings(settings: Settings): void {
  writeJson(STORAGE_KEYS.settings, { ...settings, id: 1 });
}
