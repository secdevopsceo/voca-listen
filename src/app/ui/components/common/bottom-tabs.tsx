/**
 * 아래 탭 막대 — 이 앱의 주된 이동 수단
 * 휴대폰에서 한 손으로 닿는 자리에 두고, PC 에서는 가운데로 모아 같은 모양을 유지한다.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, BookMarked, Headphones, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/ui/wordbooks", key: "wordbooks", Icon: BookMarked },
  { href: "/ui/listen", key: "listen", Icon: Headphones },
  { href: "/ui/quiz", key: "quiz", Icon: ListChecks },
  { href: "/ui/stats", key: "stats", Icon: BarChart3 },
] as const;

export function BottomTabs() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="sticky bottom-0 z-50 border-t border-border/80 bg-background/85 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-3xl">
        {TABS.map(({ href, key, Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex flex-col items-center gap-1 py-2.5 text-[11px] tracking-wide transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* 고른 탭 위에 다이얼 눈금처럼 짧은 선을 둔다 */}
                <span
                  className={cn(
                    "absolute -top-px h-[2px] rounded-full bg-primary transition-all duration-300",
                    isActive ? "w-8 opacity-100" : "w-0 opacity-0",
                  )}
                />
                <Icon
                  className={cn(
                    "size-5 transition-transform duration-300",
                    isActive && "-translate-y-px",
                  )}
                  strokeWidth={isActive ? 2.2 : 1.7}
                />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
