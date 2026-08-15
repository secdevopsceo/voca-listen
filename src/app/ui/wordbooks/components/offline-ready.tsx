/**
 * 인터넷 없이 쓰기 — 첫 화면(단어장) 맨 위 띠
 *
 * 🚨 순서를 지킨다. 한 번에 두 가지를 같이 보여 주면 헷갈린다.
 *   ① 아직 홈 화면에 없다  → 홈 화면 추가 안내·버튼만 보여 준다
 *   ② 홈 화면 앱으로 실행 중 → 그때부터 「준비하기」로 화면을 받아 둔다
 *   ③ 받는 중             → 화면 하나씩 진행 상황·크기·속도를 보여 준다
 *   ④ 준비가 끝났다        → 조용한 한 줄만 남기고 버튼은 치운다
 *
 * ①②를 나눈 것은 취향이 아니라 필요다 — 아이폰은 사파리 탭과 홈 화면 앱의 저장 공간이
 * 서로 달라서, 탭에서 미리 받아 봐야 홈 화면 앱에서는 하나도 쓸 수 없다.
 *
 * ③이 필요한 이유: 예전에는 「받는 중…」과 「0/6개」만 한참 떠 있어 멈춘 것처럼 보였다.
 *
 * 홈 화면 추가는 플랫폼마다 할 수 있는 한계가 다르다(@/lib/install-prompt 참고).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Circle, CloudDownload, LoaderCircle, Share, SquarePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  type InstallOutcome,
  canPromptInstall,
  isStandalone,
  needsManualInstall,
  promptInstall,
  subscribeInstall,
} from "@/lib/install-prompt";
import {
  type OfflineStatus,
  type PrepareProgress,
  type RouteProgress,
  canUseOffline,
  checkOfflineStatus,
  prepareOffline,
} from "@/lib/offline";

/**
 * 화면 이름은 이미 쓰고 있는 문구를 그대로 가져다 쓴다.
 * 🚨 @/lib/offline 의 OFFLINE_ROUTES 에 화면을 더하면 여기에도 더한다.
 */
const ROUTE_LABEL_KEYS: Record<string, string> = {
  "/ui/wordbooks": "nav.wordbooks",
  "/ui/wordbooks/trash": "trash.title",
  "/ui/listen": "nav.listen",
  "/ui/quiz": "nav.quiz",
  "/ui/stats": "nav.stats",
  "/ui/settings": "nav.settings",
};

/** 바이트를 읽기 쉬운 크기로. KB·MB 는 만국 공통 기호라 번역하지 않는다 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 한 화면 줄의 왼쪽 아이콘 */
function StateIcon({ state }: { state: RouteProgress["state"] }) {
  if (state === "done") return <Check className="size-3.5 shrink-0 text-primary" strokeWidth={2.4} />;
  if (state === "failed") return <X className="size-3.5 shrink-0 text-destructive" strokeWidth={2.4} />;
  if (state === "downloading") {
    return <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" strokeWidth={2} />;
  }
  return <Circle className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.6} />;
}

export function OfflineReady() {
  const t = useTranslations("offline");
  // 화면 이름은 offline 바깥 네임스페이스에 있어 최상위 번역기를 따로 쓴다
  const tAll = useTranslations();
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<PrepareProgress | null>(null);
  const [online, setOnline] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [outcome, setOutcome] = useState<InstallOutcome | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await checkOfflineStatus());
  }, []);

  useEffect(() => {
    if (!canUseOffline()) {
      setSupported(false);
      return;
    }
    setOnline(navigator.onLine);
    setInstalled(isStandalone());
    setInstallable(canPromptInstall());
    void refresh();

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const unsubscribe = subscribeInstall(() => {
      setInstallable(canPromptInstall());
      setInstalled(isStandalone());
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, [refresh]);

  /**
   * 🚨 설치 팝업은 사용자가 누를 때까지 끝나지 않는다.
   * 그래서 「받는 중」과 「추가하는 중」을 반드시 나눈다 —
   * 합쳐 두면 받기가 끝났는데도 버튼이 "받는 중…"에 멈춰 있는 것처럼 보인다.
   */
  const handleInstall = async () => {
    setInstalling(true);
    try {
      setOutcome(await promptInstall());
    } finally {
      setInstalling(false);
      setInstalled(isStandalone());
    }
  };

  const handlePrepare = async () => {
    setBusy(true);
    setProgress(null);
    try {
      setStatus(await prepareOffline(setProgress));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  // 확인이 끝나기 전에는 아무것도 그리지 않는다(화면이 깜빡이지 않게)
  if (!supported || status === null) return null;

  // ① 아직 홈 화면에 없다 — 추가하는 이야기만 한다
  if (!installed) {
    if (installable) {
      return (
        <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3.5 py-2.5">
          <SquarePlus className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
          <p className="min-w-0 flex-1 text-sm">{t("installTitle")}</p>
          <Button size="sm" onClick={handleInstall} disabled={installing}>
            {installing ? t("installing") : t("installButton")}
          </Button>
        </div>
      );
    }

    // 아이폰·아이패드는 애플이 자동 추가를 막아 두어 손으로 해야 한다
    if (needsManualInstall()) {
      return (
        <div className="flex gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3.5 py-2.5">
          <Share className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.8} />
          <div className="min-w-0 flex-1">
            <p className="text-sm">{t("installTitle")}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("iosGuide")}</p>
          </div>
        </div>
      );
    }

    // 팝업을 띄웠는데 사용자가 안 하겠다고 한 경우 — 다른 길을 한 줄로 알려 준다
    if (outcome === "dismissed") {
      return (
        <p className="px-0.5 text-xs text-muted-foreground">{t("installDismissed")}</p>
      );
    }

    // 설치할 방법이 없는 브라우저에서는 아무 말도 하지 않는다
    return null;
  }

  // ③ 준비 중 — 걸음마다 다른 것을 보여 준다
  if (busy) {
    const shown: PrepareProgress = progress ?? {
      phase: "worker",
      routes: Object.keys(ROUTE_LABEL_KEYS).map((route) => ({
        route,
        state: "pending",
        bytes: 0,
      })),
      done: 0,
      total: Object.keys(ROUTE_LABEL_KEYS).length,
      bytes: 0,
      bytesPerSecond: 0,
    };

    // 앱 파일을 설치하는 동안은 진척을 알 수 없다 — 숫자 대신 무엇을 하는 중인지 말해 준다
    if (shown.phase === "worker") {
      return (
        <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3.5 py-2.5">
          <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="text-sm">{t("phaseWorker")}</p>
            <p className="text-xs text-muted-foreground">{t("phaseWorkerHint")}</p>
          </div>
        </div>
      );
    }

    const percent = Math.round((shown.done / shown.total) * 100);

    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm">
            {shown.phase === "save" ? t("phaseSaving") : t("preparing")}
          </p>
          <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {shown.done}/{shown.total} · {formatBytes(shown.bytes)} ·{" "}
            {formatBytes(Math.round(shown.bytesPerSecond))}/s
          </p>
        </div>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="mt-2.5 space-y-1">
          {shown.routes.map((item) => (
            <li key={item.route} className="flex items-center gap-2 text-xs">
              <StateIcon state={item.state} />
              <span
                className={
                  item.state === "pending" ? "flex-1 text-muted-foreground/60" : "flex-1"
                }
              >
                {tAll(ROUTE_LABEL_KEYS[item.route] ?? "common.loading")}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {item.bytes > 0 ? formatBytes(item.bytes) : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ④ 준비가 끝났다 — 조용한 한 줄만 남긴다(더 누를 것이 없으므로 버튼도 없앤다)
  if (status.workerReady && status.saved === status.total) {
    return (
      <p className="flex items-center gap-2 px-0.5 text-xs text-muted-foreground">
        <Check className="size-3.5 shrink-0 text-primary" strokeWidth={2.2} />
        {t("ready")}
      </p>
    );
  }

  // ② 홈 화면 앱으로 실행 중이지만 아직 덜 받았다
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3.5 py-2.5">
      <CloudDownload className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{online ? t("prepareTitle") : t("needOnline")}</p>
        <p className="text-xs text-muted-foreground">
          {t("savedCount", { saved: status.saved, total: status.total })}
        </p>
      </div>
      <Button size="sm" onClick={handlePrepare} disabled={!online}>
        {t("prepareButton")}
      </Button>
    </div>
  );
}
