/**
 * 홈 화면에 추가하기 테스트
 *
 * 플랫폼 판정을 잘못하면 아이폰 사용자에게 "자동으로 추가된다"고 거짓말을 하게 된다.
 * 특히 아이패드가 자신을 맥이라고 말하는 경우를 못 박아 둔다.
 */

import {
  canPromptInstall,
  isStandalone,
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
