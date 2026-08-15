/**
 * 공부할 범위 훅 — 듣기 학습 · 시험 · 단어장 목록이 함께 쓴다
 *
 * 계획서 6-1: 처음 값은 설정 기본값, 화면에서 바꾼 값은 store 에만 두고 저장하지 않는다.
 * 앱을 다시 열면 다시 설정 기본값에서 시작한다(계획서 행위 7 — 변화 없음).
 */

"use client";

import { useCallback, useEffect } from "react";
import { studyRangeFromSettings } from "@/lib/study-range";
import { setStudyRange, type StudyRange } from "@/store/slice/uiSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useSettings } from "./useSettings";

export function useStudyRange(): {
  range: StudyRange;
  setRange: (next: StudyRange) => void;
} {
  const dispatch = useAppDispatch();
  const { settings, isReady } = useSettings();
  const stored = useAppSelector((state) => state.ui.studyRange);

  // 아직 한 번도 안 채웠으면 설정 기본값으로 시작한다
  useEffect(() => {
    if (stored === null && isReady) {
      dispatch(setStudyRange(studyRangeFromSettings(settings)));
    }
  }, [stored, isReady, settings, dispatch]);

  const setRange = useCallback(
    (next: StudyRange) => {
      dispatch(setStudyRange(next));
    },
    [dispatch],
  );

  return { range: stored ?? studyRangeFromSettings(settings), setRange };
}
