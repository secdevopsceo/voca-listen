/**
 * 설정 읽기·쓰기 훅
 * 화면이 storage 를 직접 부르지 않도록 service 만 거친다(3계층 유지).
 */

"use client";

import { useCallback } from "react";
import type { Settings } from "@/lib/storage/_types";
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  type SettingsPatch,
} from "@/lib/services/settings";
import { dataChanged } from "@/store/slice/uiSlice";
import { useAppDispatch } from "@/store/hooks";
import { useStoredData } from "./useStoredData";

/** 아직 읽기 전에 쓸 기본값 — 화면이 null 을 걱정하지 않게 한다 */
const FALLBACK: Settings = {
  ...DEFAULT_SETTINGS,
  createdAt: "",
  updatedAt: "",
};

export function useSettings() {
  const dispatch = useAppDispatch();
  const { data, isReady } = useStoredData(() => getSettings());

  const update = useCallback(
    (patch: SettingsPatch) => {
      saveSettings(patch);
      dispatch(dataChanged());
    },
    [dispatch],
  );

  return { settings: data ?? FALLBACK, isReady, update };
}
