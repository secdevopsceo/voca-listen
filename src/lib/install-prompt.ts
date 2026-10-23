/**
 * 홈 화면에 추가하기 (설치)
 *
 * 🚨 플랫폼마다 할 수 있는 한계가 다르다. 억지로 같게 만들 수 없다.
 *
 * | 플랫폼 | 자동 추가 | 방법 |
 * |--------|-----------|------|
 * | 안드로이드 크롬 | 가능 | beforeinstallprompt 를 붙잡아 뒀다가 원할 때 prompt() |
 * | 안드로이드의 크롬이 아닌 브라우저 | 쓰지 않는다 | 크롬으로 이어 준다(needsChromeForInstall · chromeIntentUrl) — 삼성 인터넷이 만든 설치 파일은 플레이 프로텍트가 막는다 |
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

/**
 * 안드로이드에서 크롬이 아닌 브라우저 표시. 앱 안 브라우저(카카오톡 등)는 `; wv)` 로 드러난다 — 홈 화면 추가 자체가 안 된다.
 */
const NOT_CHROME_ON_ANDROID = /SamsungBrowser|EdgA|Firefox|OPR|Whale|YaBrowser|UCBrowser|MiuiBrowser|HuaweiBrowser|DuckDuckGo|;\s*wv\)/i;

/**
 * 안드로이드인데 크롬이 아닌 브라우저라서 크롬으로 이어 줘야 하는가.
 * 삼성 인터넷은 설치 파일(WebAPK)을 자기 서버에서 만드는데, 그 파일의 대상 안드로이드 버전이 낮아
 * 안드로이드 14 이상에서 구글 플레이 프로텍트가 "이전 버전의 안드로이드용" 이라며 설치를 막는다. 크롬이 만든 파일은 막히지 않는다
 * (삼성 인터넷 지원 이슈 #123 · 2026-10-23 확인 · 관제탑 pwa.md "PWA 공통 함정").
 * 다른 브라우저의 설치 파일은 재지 않았지만, 크롬만 문제없다고 확인됐으므로 모두 크롬으로 보낸다(2026-10-23 대표 선택).
 */
// TODO(미검증 · 2026-10-23 13:00 KST): 엣지 · 파이어폭스 · 웨일 · 앱 안 브라우저가 만드는 설치 파일도 플레이 프로텍트에 막히는지 — 재지 않았다(크롬만 문제없다고 확인돼 모두 크롬으로 보낸다)
export function needsChromeForInstall(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua)) return false;
  return !/Chrome\/\d/.test(ua) || NOT_CHROME_ON_ANDROID.test(ua);
}

/** 안드로이드 삼성 인터넷인가 — 이미 설치하다 막힌 사람에게 '무시하고 설치' 길도 알려 준다(2026-10-23 대표 지시) */
export function isSamsungInternet(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /SamsungBrowser\//.test(ua);
}

/**
 * 지금 주소를 크롬으로 여는 안드로이드 인텐트 주소. 크롬이 없으면 같은 주소를 그대로 연다(browser_fallback_url).
 * 주소의 # 뒤는 버린다 — 인텐트 주소가 # 뒤를 자기 설정 자리로 쓴다.
 */
// TODO(미검증 · 2026-10-23 13:00 KST): 삼성 인터넷 등이 이 인텐트 주소로 크롬을 실제로 여는지 · 크롬이 없는 휴대폰에서 원래 주소가 열리는지 — 크로미움에 사용자 에이전트만 바꿔 띠와 주소 모양까지만 봤다(실제 안드로이드 기기 없음)
export function chromeIntentUrl(href: string): string {
  const url = new URL(href);
  url.hash = "";
  const scheme = url.protocol.replace(":", "");
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url.href)};end`;
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
