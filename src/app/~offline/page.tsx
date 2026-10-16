/**
 * 인터넷이 끊겼을 때 대신 보여주는 화면 (관제탑 PWA 견본 .claude/templates/pwa/common/offline-page.tsx 와 같은 코드 — 2026-10-15 옮김)
 * 출처: voca-listen src/app/~offline/page.tsx (2026-08-14 커밋 346938a)
 *       + 2026-10-15 관제탑 PWA 규칙 정비에서 더한 것: 서버에 주기적으로 물어 다시 열리면 원래 화면으로 돌아가기
 * 규칙: 관제탑 .claude/rules-detail/pwa.md "PWA 공통 함정"
 *
 * 🚨 파일 위치·이름을 바꾸지 말 것 — @ducanh2912/next-pwa 가 `src/app/~offline/page.*` 를 직접 찾아보고,
 *    있으면 fallbacks.document 를 "/~offline" 으로 잡아 서비스 워커 설치 때 미리 받아 둔다.
 *    옮기면 오프라인 안내 화면이 조용히 사라진다. (화면 배치 규칙 app/ui/<사이트>/… 의 예외다)
 *
 * 저장해 두지 않은 화면을 인터넷 없이 열 때 나온다. 서버형에서는 로그인 화면이 늘 이것으로 나온다.
 * 주소창의 주소는 사용자가 열려던 화면 그대로라, 서버가 다시 응답하면 새로고침만으로 원래 화면이 열린다.
 *
 * 🚨 '연결됨'(online) 신호만 기다리지 않는다 — 폰 인터넷은 멀쩡하고 서버만 꺼졌다 돌아온 경우에는 이 신호가 오지 않는다.
 *    그래서 몇 초마다 서버에 직접 물어본다(HEAD 요청은 서비스 워커의 캐시 규칙을 타지 않고 곧장 서버로 간다).
 * 🚨 메시지 키 offline.title · offline.description · offline.retry 를 i18n 파일(ko·en)에 더한다.
 *    이 화면은 /ui/<사이트> 밖이라, 서버의 i18n 설정(request.ts)이 이 주소에서도 메시지를 싣는지 붙일 때 확인한다.
 */

"use client";

import { useEffect } from "react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** 서버에 다시 물어보는 간격 */
const RETRY_INTERVAL_MS = 5000;

export default function OfflinePage() {
  const t = useTranslations();

  useEffect(() => {
    let stopped = false;

    const tryReturn = async () => {
      if (stopped) return;
      try {
        const response = await fetch(window.location.href, { method: "HEAD", cache: "no-store" });
        // 서버가 응답했다(넘겨 주기 뒤 로그인 화면이어도 좋다) — 원래 화면을 다시 연다
        if (response.status < 500) window.location.reload();
      } catch {
        // 아직 서버에 닿지 않는다 — 다음 차례에 다시 묻는다
      }
    };

    const timer = window.setInterval(() => void tryReturn(), RETRY_INTERVAL_MS);
    const handleOnline = () => void tryReturn();
    window.addEventListener("online", handleOnline);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <div
      data-pwa-offline-page=""
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <WifiOff className="size-7 text-muted-foreground/60" strokeWidth={1.4} />
      <h1 className="font-display text-base">{t("offline.title")}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t("offline.description")}</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        {t("offline.retry")}
      </Button>
    </div>
  );
}
