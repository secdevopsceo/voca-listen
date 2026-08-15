/**
 * 홈 화면에 추가하기 (설치)
 *
 * 🚨 플랫폼마다 할 수 있는 한계가 다르다. 억지로 같게 만들 수 없다.
 *
 * | 플랫폼 | 자동 추가 | 방법 |
 * |--------|-----------|------|
 * | 안드로이드 크롬·엣지 | 가능 | beforeinstallprompt 를 붙잡아 뒀다가 원할 때 prompt() |
 * | 아이폰 사파리 | 불가능 | 애플이 API 를 열어두지 않았다 — 공유 버튼 안내만 가능 |
 * | 그 외 데스크톱 | 브라우저에 따라 다름 | 위와 동일하게 신호가 오면 가능 |
 */

/** 크롬이 보내는 설치 신호. TypeScript 기본 타입에 없어서 직접 적는다 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

/** 붙잡아 둔 설치 신호. 이게 있어야 설치 팝업을 띄울 수 있다 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function notify() {
  for (const run of subscribers) run();
}

// 신호는 화면이 그려지기 전에 올 수도 있으므로, 이 파일을 읽는 순간 바로 듣기 시작한다
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // 브라우저가 제멋대로 배너를 띄우지 못하게 막고, 우리가 원할 때 띄운다
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

/** 설치 가능 여부가 바뀔 때마다 알려준다. 돌려받은 함수를 부르면 그만 듣는다 */
export function subscribeInstall(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

/** 지금 설치 팝업을 띄울 수 있는가 (안드로이드 크롬 등) */
export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

/** 이미 홈 화면 앱으로 실행 중인가 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // 아이폰 사파리는 표준 대신 navigator.standalone 을 쓴다
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

/** 아이폰·아이패드라 사용자가 직접 추가해야 하는가 */
export function needsManualInstall(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIphone = /iPhone|iPod/i.test(ua);
  // 아이패드는 iPadOS 13 부터 자신을 맥이라고 말한다 — 손가락 입력 여부로 가른다
  const isIpad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  return isIphone || isIpad;
}

/** 설치 팝업을 띄운다. 띄울 수 없으면 unavailable 을 돌려준다 */
export async function promptInstall(): Promise<InstallOutcome> {
  if (deferredPrompt === null) return "unavailable";

  const prompt = deferredPrompt;
  // 한 번 쓴 신호는 다시 쓸 수 없다
  deferredPrompt = null;
  notify();

  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome;
  } catch {
    // 사용자 조작 없이 부르면 브라우저가 거부한다 — 버튼으로 다시 시도하게 둔다
    return "unavailable";
  }
}
