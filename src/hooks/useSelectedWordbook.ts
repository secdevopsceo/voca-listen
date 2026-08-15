/**
 * 고른 단어장 — 단어장 목록 · 듣기 학습 · 시험이 함께 쓴다
 *
 * 🚨 화면마다 따로 기억하면 안 된다. 듣기에서 「글로비시 · 명사」를 골라 놓고
 *    시험으로 넘어가면 다시 전체로 돌아가 있어, 같은 것을 세 번 고르게 된다.
 *    주인은 store 하나(ui.currentWordbookId)이고 세 화면이 그것을 본다.
 */

"use client";

import { useCallback } from "react";
import { setCurrentWordbook } from "@/store/slice/uiSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * 전체 단어장을 뜻하는 값.
 * store 는 null 로 두지만 화면의 Select 는 빈 값을 쓸 수 없어 따로 둔다.
 */
export const ALL_WORDBOOKS = "__all__";

export function useSelectedWordbook(): {
  wordbookId: string;
  setWordbookId: (next: string) => void;
} {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((state) => state.ui.currentWordbookId);

  const setWordbookId = useCallback(
    (next: string) => {
      dispatch(setCurrentWordbook(next === ALL_WORDBOOKS ? null : next));
    },
    [dispatch],
  );

  return { wordbookId: stored ?? ALL_WORDBOOKS, setWordbookId };
}
