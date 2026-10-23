/**
 * 홈 화면에 추가하기 테스트
 *
 * 플랫폼 판정을 잘못하면 아이폰 사용자에게 "자동으로 추가된다"고 거짓말을 하게 된다.
 * 특히 아이패드가 자신을 맥이라고 말하는 경우를 못 박아 둔다.
 */

import {
  canPromptInstall,
  chromeIntentUrl,
  isSamsungInternet,
  isStandalone,
  needsChromeForInstall,
  needsManualInstall,
  promptInstall,
} from "./install-prompt";

/** userAgent·maxTouchPoints 를 갈아 끼운다 */
function setDevice(userAgent: string, maxTouchPoints = 0) {
  Object.defineProperty(navigator, "userAgent", { value: userAgent, configurable: true });
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: maxTouchPoints,
    configurable: true,
  });
}

/** 홈 화면 앱으로 실행 중인지 여부를 갈아 끼운다 */
function setDisplayMode({ standalone }: { standalone: boolean }) {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({ matches: standalone && query.includes("standalone") }),
    configurable: true,
  });
  Object.defineProperty(navigator, "standalone", { value: undefined, configurable: true });
}

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140";

describe("needsManualInstall — 손으로 추가해야 하는 기기인가", () => {
  it("아이폰이면 손으로 추가해야 한다", () => {
    setDevice(IPHONE);
    expect(needsManualInstall()).toBe(true);
  });

  it("🚨 아이패드는 자신을 맥이라 말하지만 손가락 입력이 있으므로 걸러낸다", () => {
    setDevice(IPAD, 5);
    expect(needsManualInstall()).toBe(true);
  });

  it("진짜 맥은 손으로 추가하는 대상이 아니다", () => {
    setDevice(MAC, 0);
    expect(needsManualInstall()).toBe(false);
  });

  it("안드로이드는 자동 추가가 되므로 대상이 아니다", () => {
    setDevice(ANDROID, 5);
    expect(needsManualInstall()).toBe(false);
  });
});

describe("isStandalone — 이미 홈 화면 앱으로 실행 중인가", () => {
  it("홈 화면 앱이면 참", () => {
    setDisplayMode({ standalone: true });
    expect(isStandalone()).toBe(true);
  });

  it("브라우저 탭이면 거짓", () => {
    setDisplayMode({ standalone: false });
    expect(isStandalone()).toBe(false);
  });

  it("아이폰은 표준 대신 navigator.standalone 을 쓴다", () => {
    setDisplayMode({ standalone: false });
    Object.defineProperty(navigator, "standalone", { value: true, configurable: true });
    expect(isStandalone()).toBe(true);
  });
});

describe("promptInstall — 설치 팝업", () => {
  it("붙잡아 둔 신호가 없으면 unavailable 을 돌려준다", async () => {
    expect(canPromptInstall()).toBe(false);
    await expect(promptInstall()).resolves.toBe("unavailable");
  });

  it("브라우저가 신호를 보내면 팝업을 띄우고 결과를 돌려준다", async () => {
    const prompt = jest.fn(async () => {});
    const event = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: "accepted" });

    window.dispatchEvent(event);
    expect(canPromptInstall()).toBe(true);

    await expect(promptInstall()).resolves.toBe("accepted");
    expect(prompt).toHaveBeenCalledTimes(1);

    // 한 번 쓴 신호는 다시 쓸 수 없다
    expect(canPromptInstall()).toBe(false);
  });
});

// 안드로이드 브라우저별 사용자 에이전트 글(2026-10 기준 형태 — 판정에 쓰는 표시만 맞으면 된다)
const SAMSUNG = "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const ANDROID_EDGE = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 EdgA/140.0.0.0";
const ANDROID_FIREFOX = "Mozilla/5.0 (Android 15; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0";
const ANDROID_WHALE = "Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Whale/4.31.0.0 Mobile Safari/537.36";
const KAKAOTALK = "Mozilla/5.0 (Linux; Android 14; SM-S928N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.8.0";

describe("needsChromeForInstall — 안드로이드에서 크롬으로 이어 줘야 하는가", () => {
  it.each([
    ["🚨 삼성 인터넷 — 이 브라우저가 만든 설치 파일을 플레이 프로텍트가 막는다", SAMSUNG, true],
    ["안드로이드 엣지", ANDROID_EDGE, true],
    ["안드로이드 파이어폭스", ANDROID_FIREFOX, true],
    ["안드로이드 웨일", ANDROID_WHALE, true],
    ["카카오톡 앱 안 브라우저(; wv)", KAKAOTALK, true],
    ["안드로이드 크롬은 지금처럼 설치 단추", ANDROID_CHROME, false],
    ["아이폰은 공유 버튼 안내라 대상이 아니다", IPHONE, false],
    ["컴퓨터 크롬은 대상이 아니다", MAC, false],
  ])("%s", (_name, ua, expected) => {
    setDevice(ua, 5);
    expect(needsChromeForInstall()).toBe(expected);
  });
});

describe("isSamsungInternet — '무시하고 설치' 안내를 더 붙일 브라우저인가", () => {
  it("삼성 인터넷만 참", () => {
    setDevice(SAMSUNG, 5);
    expect(isSamsungInternet()).toBe(true);
  });

  it.each([ANDROID_CHROME, ANDROID_EDGE, KAKAOTALK, IPHONE])("그 밖은 거짓 — %s", (ua) => {
    setDevice(ua, 5);
    expect(isSamsungInternet()).toBe(false);
  });
});

describe("chromeIntentUrl — 지금 주소를 크롬으로 여는 주소", () => {
  it("경로 · 쿼리를 싣고, 크롬이 없을 때 열 원래 주소를 붙이며 # 뒤는 버린다", () => {
    expect(chromeIntentUrl("https://offline-games-pwa.vercel.app/ui/user/logged-out?x=1#top")).toBe(
      "intent://offline-games-pwa.vercel.app/ui/user/logged-out?x=1#Intent;scheme=https;package=com.android.chrome;" +
        "S.browser_fallback_url=https%3A%2F%2Foffline-games-pwa.vercel.app%2Fui%2Fuser%2Flogged-out%3Fx%3D1;end",
    );
  });

  it("포트와 한글 경로를 그대로 싣는다(한글은 주소 규칙대로 바뀐 글자로)", () => {
    expect(chromeIntentUrl("https://a.example:8443/단어장")).toBe(
      "intent://a.example:8443/%EB%8B%A8%EC%96%B4%EC%9E%A5#Intent;scheme=https;package=com.android.chrome;" +
        "S.browser_fallback_url=https%3A%2F%2Fa.example%3A8443%2F%25EB%258B%25A8%25EC%2596%25B4%25EC%259E%25A5;end",
    );
  });
});
