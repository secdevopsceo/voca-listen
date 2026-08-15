/**
 * 소리 파형 표시
 * 읽는 중일 때 막대가 오르내려, 지금 소리가 나고 있다는 것을 눈으로도 알 수 있게 한다.
 */

"use client";

import { cn } from "@/lib/utils";

const BAR_DELAYS = ["0ms", "120ms", "240ms", "160ms", "60ms"];

export function SoundWave({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex h-4 items-end gap-[3px]", className)}
      aria-hidden="true"
    >
      {BAR_DELAYS.map((delay, index) => (
        <span
          key={index}
          className={cn(
            "w-[3px] origin-bottom rounded-full bg-current transition-all",
            active ? "h-full" : "h-[3px] opacity-40",
          )}
          style={
            active
              ? { animation: `wave-bar 900ms ease-in-out ${delay} infinite` }
              : undefined
          }
        />
      ))}
    </span>
  );
}
