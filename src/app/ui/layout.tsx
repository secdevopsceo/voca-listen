/**
 * 앱 화면 공통 뼈대 — 머리말 + 본문 + 아래 탭 막대
 */

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppBootstrap } from "./components/common/app-bootstrap";
import { AppHeader } from "./components/common/app-header";
import { BottomTabs } from "./components/common/bottom-tabs";

export default function UiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppBootstrap />
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-5">{children}</main>
      <BottomTabs />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
