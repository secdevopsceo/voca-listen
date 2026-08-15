/**
 * 인터넷이 끊겼을 때 대신 보여주는 화면
 *
 * 🚨 파일 위치·이름을 바꾸지 말 것 — @ducanh2912/next-pwa 가 `src/app/~offline/page.*` 가
 *    있는지 직접 찾아보고, 있으면 fallbacks.document 를 "/~offline" 으로 잡아
 *    서비스 워커 설치 시점에 이 화면을 미리 받아 둔다(precache).
 *    옮기면 자동 감지가 풀려 오프라인 대체 화면이 조용히 사라진다.
 *
 * 한 번도 열어본 적 없는 화면을 인터넷 없이 열었을 때만 나온다.
 * 이미 열어본 화면은 pages 캐시에 남아 있어 진짜 화면이 그대로 나온다.
 */

"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const t = useTranslations();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <WifiOff className="size-7 text-muted-foreground/60" strokeWidth={1.4} />
      <h1 className="font-display text-base">{t("offline.title")}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {t("offline.description")}
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        {t("offline.retry")}
      </Button>
    </div>
  );
}
