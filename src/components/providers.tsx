/**
 * 앱 전체를 감싸는 Provider 묶음
 * Redux(화면 상태) · 테마(다크/라이트) · 툴팁을 한 곳에서 걸어준다.
 * i18n Provider 는 서버에서 메시지를 넣어야 해서 layout 에 둔다.
 */

"use client";

import { useRef, type ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { makeStore, type AppStore } from "@/store/store";

export function Providers({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  const persistorRef = useRef<ReturnType<typeof persistStore> | null>(null);

  if (storeRef.current === null) {
    storeRef.current = makeStore();
    persistorRef.current = persistStore(storeRef.current);
  }

  return (
    <ReduxProvider store={storeRef.current}>
      {/* 저장된 화면 상태를 다 읽을 때까지는 아무것도 그리지 않는다(깜빡임 방지) */}
      <PersistGate loading={null} persistor={persistorRef.current!}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider delay={300}>{children}</TooltipProvider>
        </ThemeProvider>
      </PersistGate>
    </ReduxProvider>
  );
}
