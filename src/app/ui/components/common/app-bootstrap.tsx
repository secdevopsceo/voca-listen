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
import { canUseOffline, prepareOffline } from "@/lib/offline";
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

  useEffect(() => {
    // 개발 모드에는 서비스 워커가 없어 아무것도 하지 않는다
    if (!canUseOffline()) return;

    let done = false;
    const warm = () => {
      // 🚨 인터넷이 없으면 요청을 아예 던지지 않는다.
      // 비행기모드에서 요청을 던지면 iOS 가 "데이터에 접근하려면 에어플레인 모드를 끄거나
      // Wi-Fi를 사용하십시오" 시스템 알림을 띄운다. 어차피 실패할 요청이므로 참는다.
      if (done || !navigator.onLine) return;
      done = true;
      // 첫 화면 그리기를 방해하지 않도록 한가할 때 받는다
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => void prepareOffline());
      } else {
        window.setTimeout(() => void prepareOffline(), 2000);
      }
    };

    void navigator.serviceWorker.ready.then(warm).catch(() => {});
    // 비행기모드를 껐을 때 그제서야 받아 둔다
    window.addEventListener("online", warm);
    return () => window.removeEventListener("online", warm);
  }, []);

  return null;
}
