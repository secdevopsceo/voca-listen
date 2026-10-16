/** @jest-environment jsdom */
// 브라우저 쪽 시험 — 기본 스택의 Jest 기본 환경은 node 라 위 줄이 없으면 window 가 없다. 프로젝트에 jest-environment-jsdom 이 없으면 pnpm add -D jest-environment-jsdom — 지정은 위 한 줄에만 둔다(설명을 같은 주석에 이어 쓰면 환경 이름에 붙어 읽힌다)

/**
 * 오프라인 준비 시험 (관제탑 견본 — .claude/templates/pwa/offline/offline.test.ts)
 * 출처: voca-listen src/lib/offline.test.ts + 2026-10-15 관제탑 PWA 규칙 정비에서 더한 시험
 *       (HTML 요청 머리 · 같은 때 두 번 받지 않기 · 새 서비스 워커가 자리를 잡으면 다시 받기)
 *
 * 비행기모드에서 요청을 던지면 iOS 가 시스템 알림을 띄웠던 사고가 있었다.
 * "인터넷이 없으면 한 건도 요청하지 않는다"를 특히 못 박아 둔다.
 * 🚨 OFFLINE_ROUTES 가 2개 이상이어야 한다(아래 시험이 앞의 두 화면을 쓴다).
 */

import { OFFLINE_ROUTES, type PrepareProgress, checkOfflineStatus, prepareOffline, startOfflineSync } from "./offline";

const [FIRST, SECOND] = OFFLINE_ROUTES;

/** 가짜 응답 — 구현은 "있다/없다"만 보므로 빈 객체로 충분하다(jsdom 에는 Response 전역이 없다) */
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

/** caches.open 이 돌려줄 가짜 캐시 — 배열을 그대로 들고 있으므로, 시험 중에 밀어 넣으면 "나중에 담긴" 상황이 된다 */
function fakeCache(savedRoutes: string[]) {
  return {
    match: jest.fn(async (route: string) => (savedRoutes.includes(route) ? FOUND : undefined)),
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
  Object.defineProperty(navigator, "serviceWorker", { value: serviceWorker, configurable: true });
  Object.defineProperty(globalThis, "caches", {
    value: { open: jest.fn(async () => cache) },
    configurable: true,
  });

  return { cache, serviceWorker };
}

/** 조건이 참이 될 때까지 기다린다(최대 2초) */
async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
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
    setupBrowser({ active: true, online: true, savedRoutes: [FIRST, SECOND] });

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

  it("🚨 인터넷이 있으면 모든 화면을 HTML 요청으로 한 번씩 받는다", async () => {
    // 화면 상자(pages 규칙)는 HTML 요청만 받는다 — Accept 머리가 없으면 받아도 담기지 않는다
    setupBrowser({ active: true, online: true, savedRoutes: OFFLINE_ROUTES });
    const fetchSpy = jest.fn(async () => FOUND);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const status = await prepareOffline();

    expect(fetchSpy).toHaveBeenCalledTimes(OFFLINE_ROUTES.length);
    for (const route of OFFLINE_ROUTES) {
      expect(fetchSpy).toHaveBeenCalledWith(route, { credentials: "same-origin", headers: { Accept: "text/html" } });
    }
    expect(status.saved).toBe(OFFLINE_ROUTES.length);
  });

  it("🚨 같은 때 두 번 불러도 화면마다 한 번만 받는다", async () => {
    // 앱이 스스로 받는 것과 「준비하기」 버튼이 겹치는 경우
    setupBrowser({ active: true, online: true, savedRoutes: OFFLINE_ROUTES });
    const fetchSpy = jest.fn(async () => FOUND);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const [first, second] = await Promise.all([prepareOffline(), prepareOffline()]);

    expect(fetchSpy).toHaveBeenCalledTimes(OFFLINE_ROUTES.length);
    expect(second).toEqual(first);
  });

  it("🚨 서비스 워커가 아직 이 화면을 맡기 전이면, 맡을 때까지 기다렸다 받는다", async () => {
    // 홈 화면 앱을 처음 열었을 때의 상황 — 「준비하기」를 두 번 눌러야 했던 버그
    const { serviceWorker } = setupBrowser({ active: true, online: true, savedRoutes: OFFLINE_ROUTES, controlled: false });
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
    const saved = [FIRST, SECOND];
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
    globalThis.fetch = jest.fn(async () => streamingResponse([1000, 2000, 500])) as unknown as typeof fetch;

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
    const tooManyAtOnce = reports.some((progress) => progress.routes.filter((item) => item.state === "downloading").length > 1);
    expect(tooManyAtOnce).toBe(false);
  });

  it("한 화면이 실패해도 나머지는 계속 받고, 실패한 화면은 실패로 표시된다", async () => {
    setupBrowser({ active: true, online: true, savedRoutes: [FIRST] });
    const fetchSpy = jest.fn(async (route: string) => {
      if (route === SECOND) throw new Error("network down");
      return streamingResponse([100]);
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const reports: PrepareProgress[] = [];
    const status = await prepareOffline((progress) => reports.push(progress));

    expect(fetchSpy).toHaveBeenCalledTimes(OFFLINE_ROUTES.length);
    const last = reports[reports.length - 1];
    expect(last.routes.find((item) => item.route === SECOND)?.state).toBe("failed");
    expect(last.routes.filter((item) => item.state === "done")).toHaveLength(OFFLINE_ROUTES.length - 1);
    expect(status.saved).toBe(1);
  });
});

describe("startOfflineSync", () => {
  beforeEach(() => {
    // 한가할 때 받기 — 시험에서는 바로 부른다
    Object.defineProperty(window, "requestIdleCallback", {
      value: (callback: () => void) => {
        callback();
        return 1;
      },
      configurable: true,
    });
  });

  it("🚨 앱을 열 때 한 번 받고, 새 서비스 워커가 자리를 잡으면 다시 받는다", async () => {
    // 새 버전 배포 뒤 저장된 화면을 새 버전으로 바꿔 두지 않으면, 열어 둔 옛 화면에서 인터넷 없이 탭을 옮길 때 깨질 수 있다
    const { serviceWorker } = setupBrowser({ active: true, online: true, savedRoutes: OFFLINE_ROUTES });
    const fetchSpy = jest.fn(async () => FOUND);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const stop = startOfflineSync();
    await waitFor(() => fetchSpy.mock.calls.length === OFFLINE_ROUTES.length);
    expect(fetchSpy).toHaveBeenCalledTimes(OFFLINE_ROUTES.length);
    await new Promise((resolve) => setTimeout(resolve, 50));

    serviceWorker.dispatchEvent(new Event("controllerchange"));
    await waitFor(() => fetchSpy.mock.calls.length === OFFLINE_ROUTES.length * 2);
    expect(fetchSpy).toHaveBeenCalledTimes(OFFLINE_ROUTES.length * 2);

    stop();
  });

  it("🚨 인터넷이 없으면 새 서비스 워커가 와도 요청하지 않는다", async () => {
    const { serviceWorker } = setupBrowser({ active: true, online: false, savedRoutes: [] });
    const fetchSpy = jest.fn(async () => FOUND);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const stop = startOfflineSync();
    serviceWorker.dispatchEvent(new Event("controllerchange"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchSpy).not.toHaveBeenCalled();
    stop();
  });
});
