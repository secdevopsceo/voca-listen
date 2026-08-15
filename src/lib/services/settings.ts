/**
 * 설정 규칙 계산
 * 계획서 데이터 변화 행위 14(설정 바꾸기) 담당.
 * 화면이 storage 를 직접 부르지 않도록 얇게 감싼다(3계층 유지).
 */

import { runInTransaction } from "@/lib/storage/_client";
import type { Settings } from "@/lib/storage/_types";
import * as settingsStorage from "@/lib/storage/settings";
import { ok, type ServiceResult } from "./_result";

export type { SettingsPatch } from "@/lib/storage/settings";
/** 아직 저장된 설정이 없을 때 화면이 쓸 기본값 — 화면이 storage 를 직접 보지 않게 여기서 넘긴다 */
export { DEFAULT_SETTINGS } from "@/lib/storage/settings";

/** 읽기 속도로 고를 수 있는 값 */
export const TTS_RATE_MIN = 0.5;
export const TTS_RATE_MAX = 2;

/** 자동 재생 간격으로 고를 수 있는 값(밀리초) */
export const TTS_GAP_MIN_MS = 0;
export const TTS_GAP_MAX_MS = 3000;

/** 자동 재생 반복 횟수 */
export const TTS_REPEAT_MIN = 1;
export const TTS_REPEAT_MAX = 5;

/** 지금 설정 */
export function getSettings(): Settings {
  return settingsStorage.selectSettings();
}

/**
 * 행위 14 — 설정 바꾸기
 * 범위를 벗어난 값은 허용 범위 안으로 맞춰 저장한다.
 */
export function saveSettings(
  patch: settingsStorage.SettingsPatch,
): ServiceResult<Settings> {
  const safePatch: settingsStorage.SettingsPatch = { ...patch };

  if (safePatch.ttsRate !== undefined) {
    safePatch.ttsRate = clamp(safePatch.ttsRate, TTS_RATE_MIN, TTS_RATE_MAX);
  }
  if (safePatch.ttsGapMs !== undefined) {
    safePatch.ttsGapMs = Math.round(clamp(safePatch.ttsGapMs, TTS_GAP_MIN_MS, TTS_GAP_MAX_MS));
  }
  if (safePatch.ttsRepeat !== undefined) {
    safePatch.ttsRepeat = Math.round(
      clamp(safePatch.ttsRepeat, TTS_REPEAT_MIN, TTS_REPEAT_MAX),
    );
  }

  // 공부할 범위 — 최솟값이 최댓값보다 크면 뒤집힌 채 저장되지 않게 맞바꾼다(계획서 행위 6)
  swapIfReversed(safePatch, "studyImportanceMin", "studyImportanceMax");
  swapIfReversed(safePatch, "studyDifficultyMin", "studyDifficultyMax");

  const saved = runInTransaction(() => settingsStorage.updateSettings(safePatch));
  return ok(saved);
}

/**
 * 최솟값이 최댓값보다 크면 두 값을 맞바꾼다.
 * 한쪽만 넘어온 경우는 다른 쪽을 모르므로 건드리지 않는다(그때는 화면이 이미 맞춰 보낸다).
 */
function swapIfReversed(
  patch: settingsStorage.SettingsPatch,
  minKey: "studyImportanceMin" | "studyDifficultyMin",
  maxKey: "studyImportanceMax" | "studyDifficultyMax",
): void {
  const min = patch[minKey];
  const max = patch[maxKey];
  if (min === undefined || max === undefined) return;
  if (min <= max) return;
  patch[minKey] = max;
  patch[maxKey] = min;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
