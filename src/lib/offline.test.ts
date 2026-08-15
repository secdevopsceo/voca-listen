/**
 * 오프라인 준비 테스트
 *
 * 비행기모드에서 요청을 던지면 iOS 가 시스템 알림을 띄웠던 사고가 있었다.
 * "인터넷이 없으면 한 건도 요청하지 않는다"를 특히 못 박아 둔다.
 */

import {
  OFFLINE_ROUTES,
  type PrepareProgress,
  checkOfflineStatus,
  prepareOffline,
} from "./offline";

/**
 * 가짜 응답 — 구현은 "있다/없다"만 보므로 빈 객체로 충분하다.
 * (jsdom 환경에는 Response 전역이 없어 진짜 객체를 만들 수 없다.)
 */
const FOUND = {
  body: null,
  arrayBuffer: async () => new ArrayBuffer(0),
} as unknown as Response;

/** 조각을 나눠 보내는 가짜 응답 — 진행 상황이 조금씩 올라가는지 보려고 쓴다 */
function streamingResponse(chunkSizes: number[]): Response {
  let index = 0;
  return {
    body: {
      getReader: () => ({
        read: async () =>
          index < chunkSizes.length
            ? { done: false, value: new Uint8Array(chunkSizes[index++]) }
            : { done: true, value: undefined },
      }),
    },
  } as unknown as Response;
}

/**
 * caches.open 이 돌려줄 가짜 캐시 — 담아 둔 주소만 기억한다.
 * 배열을 그대로 들고 있으므로, 테스트 중에 밀어 넣으면 "나중에 담긴" 상황이 된다.
 */
function fakeCache(savedRoutes: string[]) {
  return {
    match: jest.fn(async (route: string) =>
      savedRoutes.includes(route) ? FOUND : undefined,
    ),
  };
}

/** navigator·caches 를 통째로 갈아 끼운다 */
function setupBrowser({
  active,
  online,
  savedRoutes,
  controlled = true,
}: {
  active: boolean;
  online: boolean;
  savedRoutes: string[];
  /** 서비스 워커가 이미 이 화면을 맡고 있는가 */
  controlled?: boolean;
}) {
  const cache = fakeCache(savedRoutes);

  // controllerchange 를 흉내내려면 진짜 이벤트 대상이어야 한다
  const serviceWorker = new EventTarget() as EventTarget & {
    controller: object | null;
    getRegistration: () => Promise<unknown>;
    ready: Promise<unknown>;
  };
  serviceWorker.controller = controlled ? {} : null;
  serviceWorker.getRegistration = jest.fn(async () => (active ? { active: {} } : undefined));
  serviceWorker.ready = Promise.resolve({ active: {} });

  Object.defineProperty(navigator, "onLine", { value: online, configurable: true });
  Object.defineProperty(navigator, "serviceWorker", {
    value: serviceWorker,
    configurable: true,
  });
  Object.defineProperty(globalThis, "caches", {
    value: { open: jest.fn(async () => cache) },
    configurable: true,
  });

  return { cache, serviceWorker };
}

describe("checkOfflineStatus", () => {
  it("서비스 워커가 없으면 준비 안 됨으로 본다", async () => {
    setupBrowser({ active: false, online: true, savedRoutes: [] });

    const status = await checkOfflineStatus();

    expect(status.workerReady).toBe(false);
    expect(status.saved).toBe(0);
    expect(status.total).toBe(OFFLINE_ROUTES.length);
  });

  it("캐시에 담긴 화면 수를 정확히 센다", async () => {
    setupBrowser({
      active: true,
      online: true,
      savedRoutes: ["/ui/wordbooks", "/ui/quiz"],
    });

    const status = await checkOfflineStatus();

    expect(status.workerReady).toBe(true);
    expect(status.saved).toBe(2);
    expect(status.total).toBe(OFFLINE_ROUTES.length);
  });
});

describe("prepareOffline", () => {
  it("🚨 인터넷이 없으면 한 건도 요청하지 않는다", async () => {
    setupBrowser({ active: true, online: false, savedRoutes: [] });
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await prepareOffline();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("인터넷이 있으면 모든 화면을 한 번씩 받는다", async () => {
    setupBrowser({ active: true, online: true, savedRoutes: OFFLINE_ROUTES });
    const fetchSpy = jest.fn(async () => FOUND);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const status = await prepareOffline();

    expect(fetchSpy).toHaveBeenCalledTimes(OFFLINE_ROUTES.length);
    for (const route of OFFLINE_ROUTES) {
      expect(fetchSpy).toHaveBeenCalledWith(route, { credentials: "same-origin" });
    }
    expect(status.saved).toBe(OFFLINE_ROUTES.length);
  });

  it("🚨 서비스 워커가 아직 이 화면을 맡기 전이면, 맡을 때까지 기다렸다 받는다", async () => {
    // 홈 화면 앱을 처음 열었을 때의 상황 — 「준비하기」를 두 번 눌러야 했던 버그
    const { serviceWorker } = setupBrowser({
      active: true,
      online: true,
      savedRoutes: OFFLINE_ROUTES,
      controlled: false,
    });
    const fetchSpy = jest.fn(async () => FOUND);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const pending = prepareOffline();

    // 아직 맡기 전이라 한 건도 보내지 않았어야 한다
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();

    // 이제 맡았다고 알린다
    serviceWorker.controller = {};
    serviceWorker.dispatchEvent(new Event("controllerchange"));

    const status = await pending;
    expect(fetchSpy).toHaveBeenCalledTimes(OFFLINE_ROUTES.length);
    expect(status.saved).toBe(OFFLINE_ROUTES.length);
  });

  it("🚨 캐시 쓰기가 늦게 끝나도 다 담길 때까지 기다렸다가 센다", async () => {
    // 실제 아이폰 증상: fetch 는 끝났는데 workbox 가 아직 캐시에 쓰는 중이라 2/6 으로 보였다
    const saved = ["/ui/wordbooks", "/ui/quiz"];
    setupBrowser({ active: true, online: true, savedRoutes: saved });
    globalThis.fetch = jest.fn(async () => FOUND) as unknown as typeof fetch;

    // 조금 뒤에 나머지가 담긴다
    setTimeout(() => {
      saved.push(...OFFLINE_ROUTES.filter((route) => !saved.includes(route)));
    }, 400);

    const status = await prepareOffline();

    expect(status.saved).toBe(OFFLINE_ROUTES.length);
  });

  it("🚨 화면을 하나씩 받으면서 진행 상황·받은 크기를 알려 준다", async () => {
    // 예전에는 「받는 중…」만 한참 떠 있어 멈춘 것처럼 보였다
    setupBrowser({ active: true, online: true, savedRoutes: OFFLINE_ROUTES });
    globalThis.fetch = jest.fn(async () =>
      streamingResponse([1000, 2000, 500]),
    ) as unknown as typeof fetch;

    const reports: PrepareProgress[] = [];
    await prepareOffline((progress) => reports.push(progress));

    const last = reports[reports.length - 1];
    expect(last.done).toBe(OFFLINE_ROUTES.length);
    expect(last.total).toBe(OFFLINE_ROUTES.length);
    // 화면 하나당 3500 바이트씩 받았다
    expect(last.bytes).toBe(3500 * OFFLINE_ROUTES.length);
    expect(last.bytesPerSecond).toBeGreaterThan(0);
    expect(last.routes.every((item) => item.state === "done")).toBe(true);

    // 한 번에 하나씩 받는다 — 동시에 받는 중인 화면이 둘 이상인 순간이 없어야 한다
    const tooManyAtOnce = reports.some(
      (progress) => progress.routes.filter((item) => item.state === "downloading").length > 1,
    );
    expect(tooManyAtOnce).toBe(false);
  });

  it("받다가 실패한 화면은 실패로 표시된다", async () => {
    setupBrowser({ active: true, online: true, savedRoutes: ["/ui/wordbooks"] });
    globalThis.fetch = jest.fn(async (route: string) => {
      if (route === "/ui/quiz") throw new Error("network down");
      return streamingResponse([100]);
    }) as unknown as typeof fetch;

    const reports: PrepareProgress[] = [];
    await prepareOffline((progress) => reports.push(progress));

    const last = reports[reports.length - 1];
    expect(last.routes.find((item) => item.route === "/ui/quiz")?.state).toBe("failed");
    expect(last.routes.filter((item) => item.state === "done")).toHaveLength(
      OFFLINE_ROUTES.length - 1,
    );
  });

  it("한 화면이 실패해도 나머지는 계속 받는다", async () => {
    setupBrowser({ active: true, online: true, savedRoutes: ["/ui/wordbooks"] });
    const fetchSpy = jest.fn(async (route: string) => {
      if (route === "/ui/quiz") throw new Error("network down");
      return FOUND;
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const status = await prepareOffline();

    expect(fetchSpy).toHaveBeenCalledTimes(OFFLINE_ROUTES.length);
    expect(status.saved).toBe(1);
  });
});
