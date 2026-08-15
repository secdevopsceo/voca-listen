/**
 * 스피커 버튼 — 눌러서 한 덩어리를 소리로 듣는다.
 * 단어 목록·시험(눈으로 풀기)·듣기 학습 어디서나 같은 모양으로 쓴다.
 */

"use client";

import { useTranslations } from "next-intl";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import { useTTS } from "@/hooks/useTTS";
import { cn } from "@/lib/utils";
import { SoundWave } from "./sound-wave";

interface SpeakButtonProps {
  text: string;
  /** 브라우저 언어 코드 (예: ja-JP) */
  bcp47: string;
  size?: "sm" | "default";
  className?: string;
  /** 버튼에 붙일 설명 — 없으면 "소리로 듣기" */
  label?: string;
}

export function SpeakButton({
  text,
  bcp47,
  size = "default",
  className,
  label,
}: SpeakButtonProps) {
  const t = useTranslations("word");
  const { settings } = useSettings();
  const { speak, stop, isSpeaking, isSupported } = useTTS({
    rate: settings.ttsRate,
    gender: settings.ttsGender,
  });

  // 소리를 못 내는 환경에서는 버튼을 그리지 않는다(안내는 듣기 학습 화면이 맡는다)
  if (!isSupported || text.trim() === "") return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label ?? t("listen")}
      title={label ?? t("listen")}
      onClick={(event) => {
        event.stopPropagation();
        if (isSpeaking) {
          stop();
          return;
        }
        speak(text, bcp47);
      }}
      className={cn(
        "shrink-0 text-muted-foreground hover:text-primary",
        isSpeaking && "text-primary",
        size === "sm" && "size-8",
        className,
      )}
    >
      {isSpeaking ? (
        <SoundWave active className="h-3.5" />
      ) : (
        <Volume2 className={cn(size === "sm" ? "size-4" : "size-[18px]")} />
      )}
    </Button>
  );
}
