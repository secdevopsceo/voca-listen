/**
 * 앱을 열 때 한 번 도는 준비 작업
 * 계획서 행위 1(첫 실행 시 글로비시 단어 넣기)을 여기서 부른다.
 * 이미 넣은 적이 있으면 곧바로 끝난다.
 * 더불어 인터넷 없이 쓸 수 있도록 화면들을 조용히 미리 받아 둔다.
 *
 * 받는 일 자체는 @/lib/offline 이 맡는다 — 첫 화면의 "준비하기" 버튼과 같은 코드를 쓴다.
 * 이쪽은 사용자가 아무것도 누르지 않아도 알아서 되게 하는 몫이고,
 * 버튼 쪽은 원할 때 직접 시키고 결과를 확인하는 몫이다.
 */

"use client";

import { useEffect, useRef } from "react";
import { startOfflineSync } from "@/lib/offline";
import { seedIfNeeded } from "@/lib/services/seed";
import { dataChanged } from "@/store/slice/uiSlice";
import { useAppDispatch } from "@/store/hooks";

export function AppBootstrap() {
  const dispatch = useAppDispatch();
  // React 가 개발 모드에서 두 번 부르는 것을 막는다(시드를 두 번 넣지 않게)
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void seedIfNeeded().then((result) => {
      if (result.ok && result.data.seeded) {
        dispatch(dataChanged());
      }
    });
  }, [dispatch]);

  // 앱을 열 때 · 인터넷이 다시 연결될 때 · 새 서비스 워커가 자리를 잡을 때 화면을 받아 둔다(개발 모드에는 서비스 워커가 없어 아무것도 안 한다)
  useEffect(() => startOfflineSync(), []);

  return null;
}
