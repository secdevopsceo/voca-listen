/**
 * 화면 위쪽 머리말 — 앱 이름, 테마 바꾸기, 화면 언어 바꾸기, 설정 가기
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Languages, Moon, Settings2, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE } from "@/lib/i18n/config";

export function AppHeader() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 테마는 브라우저에서 정해지므로 첫 렌더에서는 아이콘을 고정해 깜빡임을 막는다
  useEffect(() => setMounted(true), []);

  const toggleLocale = () => {
    const next = locale === "ko" ? "en" : "ko";
    // 로케일은 주소가 아니라 쿠키로 정한다(제5장 "i18n (next-intl)")
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  const isDark = resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
        <Link href="/ui/wordbooks" className="group flex items-baseline gap-2">
          <span className="font-display text-xl leading-none tracking-tight">
            voca
            <span className="text-primary">·</span>
            listen
          </span>
          {/* 라디오 주파수 눈금 같은 잔무늬 */}
          <span
            aria-hidden="true"
            className="hidden h-3 w-16 bg-[repeating-linear-gradient(90deg,currentColor_0_1px,transparent_1px_5px)] text-border sm:block"
          />
        </Link>

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLocale}
            aria-label={t("settings.locale")}
            title={t("settings.locale")}
          >
            <Languages className="size-[18px]" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={t("settings.theme")}
            title={t("settings.theme")}
          >
            {mounted && isDark ? (
              <Sun className="size-[18px]" />
            ) : (
              <Moon className="size-[18px]" />
            )}
          </Button>

          <Button
            variant={pathname.startsWith("/ui/settings") ? "secondary" : "ghost"}
            size="icon"
            render={<Link href="/ui/settings" />}
            nativeButton={false}
            aria-label={t("nav.settings")}
            title={t("nav.settings")}
          >
            <Settings2 className="size-[18px]" />
          </Button>
        </div>
      </div>
    </header>
  );
}
