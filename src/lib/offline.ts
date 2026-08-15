/**
 * 인터넷 없이 쓰기 위한 준비
 *
 * 서비스 워커(next.config.ts 의 pages 규칙)가 한 번 받아 본 화면을 캐시에 담아 두므로,
 * 여기서 화면들을 미리 한 번씩 받아 두면 비행기모드에서도 그대로 열린다.
 *
 * 🚨 화면을 새로 만들면 OFFLINE_ROUTES 에 반드시 추가한다. 빠뜨린 화면은 오프라인에서 안 열린다.
 */

/** 인터넷 없이도 열려야 하는 화면들 */
export const OFFLINE_ROUTES = [
  "/ui/wordbooks",
  "/ui/wordbooks/trash",
  "/ui/listen",
  "/ui/quiz",
  "/ui/stats",
  "/ui/settings",
];

/** 서비스 워커가 화면을 담아 두는 캐시 이름 — next.config.ts 의 cacheName 과 같아야 한다 */
const PAGES_CACHE = "pages";

export type OfflineStatus = {
  /** 서비스 워커가 살아 있어 인터넷 없이도 화면을 대신 내줄 수 있는가 */
  workerReady: boolean;
  /** 저장이 끝난 화면 수 */
  saved: number;
  /** 저장돼야 할 전체 화면 수 */
  total: number;
};

/** 이 브라우저가 오프라인 기능을 쓸 수 있는가 (https 또는 localhost 여야 한다) */
export function canUseOffline(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof caches !== "undefined"
  );
}

/** 지금 오프라인 준비가 얼마나 됐는지 확인한다. 아무것도 바꾸지 않는다 */
export async function checkOfflineStatus(): Promise<OfflineStatus> {
  const total = OFFLINE_ROUTES.length;
  if (!canUseOffline()) return { workerReady: false, saved: 0, total };

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.active == null) return { workerReady: false, saved: 0, total };

  const cache = await caches.open(PAGES_CACHE);
  // 저장된 응답에는 Vary 헤더가 붙어 있어 ignoreVary 없이는 찾지 못할 수 있다
  const found = await Promise.all(
    OFFLINE_ROUTES.map((route) => cache.match(route, { ignoreVary: true })),
  );

  return {
    workerReady: true,
    saved: found.filter((response) => response !== undefined).length,
    total,
  };
}

/**
 * 서비스 워커가 이 화면의 요청을 실제로 맡을 때까지 기다린다.
 *
 * 🚨 없으면 첫 준비가 조용히 실패한다 — 홈 화면 앱을 처음 열면 서비스 워커가 살아나긴 해도
 *    아직 이 화면을 "맡기 전"이라, 그 사이에 보낸 요청은 서비스 워커를 그냥 지나쳐
 *    캐시에 하나도 담기지 않는다(실제로 「준비하기」를 두 번 눌러야 되는 증상이 있었다).
 *    next.config.ts 의 clientsClaim 덕에 곧 맡게 되므로 그 순간을 기다렸다 받는다.
 */
async function waitUntilControlled(timeoutMs = 5000): Promise<boolean> {
  if (navigator.serviceWorker.controller !== null) return true;

  return new Promise((resolve) => {
    const finish = (controlled: boolean) => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleChange);
      clearTimeout(timer);
      resolve(controlled);
    };
    const handleChange = () => finish(true);
    // 끝내 맡지 않아도 멈춰 있지 않는다 — 못 담았다는 결과로 돌려준다
    const timer = setTimeout(() => finish(false), timeoutMs);

    navigator.serviceWorker.addEventListener("controllerchange", handleChange);
  });
}

/**
 * 캐시에 다 담길 때까지 지켜본다.
 *
 * 🚨 없으면 "화면 2/6개 저장됨" 처럼 덜 센 값이 나온다 — workbox 는 응답을 화면에 먼저
 *    돌려주고 캐시 쓰기는 뒤에서 이어서 한다(fetchAndCachePut 이 cachePut 을 기다리지 않는다).
 *    그래서 fetch 가 끝나자마자 세면 아직 쓰는 중인 화면이 빠진 채로 세어진다.
 *    실제로 아이폰에서 2/6 이 나왔다가, 앱을 껐다 켜면 6/6 으로 보이는 증상이 있었다.
 *
 * 숫자가 늘고 있으면 계속 기다리고, 여러 번 그대로면 더 담길 게 없다고 보고 끝낸다.
 */
async function waitUntilSaved(): Promise<OfflineStatus> {
  const INTERVAL_MS = 250;
  /** 이만큼 연속으로 늘지 않으면 그만 기다린다 */
  const MAX_STILL_ROUNDS = 6;

  let status = await checkOfflineStatus();
  let stillRounds = 0;

  while (status.saved < status.total && stillRounds < MAX_STILL_ROUNDS) {
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
    const next = await checkOfflineStatus();
    stillRounds = next.saved > status.saved ? 0 : stillRounds + 1;
    status = next;
  }

  return status;
}

/** 화면 하나가 지금 어디까지 왔는지 */
export type RouteProgress = {
  route: string;
  state: "pending" | "downloading" | "done" | "failed";
  /** 지금까지 받은 바이트 */
  bytes: number;
};

/**
 * 준비는 세 걸음으로 나뉜다. 걸음마다 보여줄 말이 달라야 한다.
 *
 * 🚨 worker 걸음을 따로 두는 이유: 서비스 워커가 앱 파일을 다 받아 설치를 마쳐야
 *    화면 받기를 시작할 수 있다. 이걸 download 와 뭉뚱그리면 "0/6 · 0 B" 가
 *    한참 떠 있어 멈춘 것처럼 보인다(실제로 그렇게 보인다는 지적을 받았다).
 */
export type PreparePhase = "worker" | "download" | "save";

/** 준비하는 동안 화면에 그릴 값 전부 */
export type PrepareProgress = {
  phase: PreparePhase;
  routes: RouteProgress[];
  /** 다 받은 화면 수 */
  done: number;
  total: number;
  /** 지금까지 받은 총 바이트 */
  bytes: number;
  /** 초당 바이트 */
  bytesPerSecond: number;
};

/**
 * 한 화면을 받으면서 진행 상황을 알린다.
 * 스트림으로 조금씩 읽어야 "얼마나 왔는지"를 실시간으로 알 수 있다.
 */
async function downloadRoute(item: RouteProgress, onChunk: (bytes: number) => void): Promise<void> {
  const response = await fetch(item.route, { credentials: "same-origin" });
  const body = response.body;

  // 스트림을 읽을 수 없는 환경이면 통째로 읽는다(진행 표시는 한 번에 올라간다)
  if (body === null) {
    const buffer = await response.arrayBuffer();
    item.bytes += buffer.byteLength;
    onChunk(buffer.byteLength);
    return;
  }

  const reader = body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    item.bytes += value.byteLength;
    onChunk(value.byteLength);
  }
}

/**
 * 화면들을 한 번씩 받아 캐시에 담는다. onProgress 로 진행 상황을 계속 알려 준다.
 *
 * 🚨 인터넷이 없으면 요청을 아예 던지지 않는다 — 비행기모드에서 요청을 던지면 iOS 가
 *    "데이터에 접근하려면 에어플레인 모드를 끄거나 Wi-Fi를 사용하십시오" 알림을 띄운다.
 *
 * 🚨 한 번에 하나씩 받는다. 여섯 개를 동시에 던지면 무엇이 어디까지 왔는지 보여줄 수 없고,
 *    휴대폰 회선에서는 서로 대역폭을 나눠 가져 "한참 멈춘 것처럼" 보였다.
 *
 * 🚨 본문을 끝까지 읽는다. 헤더만 받고 끝내면 서비스 워커가 캐시에 옮겨 쓰는 일이
 *    한참 뒤에야 끝나, 아래에서 세는 숫자가 덜 나온다.
 */
export async function prepareOffline(
  onProgress?: (progress: PrepareProgress) => void,
): Promise<OfflineStatus> {
  if (!canUseOffline() || !navigator.onLine) return checkOfflineStatus();

  const routes: RouteProgress[] = OFFLINE_ROUTES.map((route) => ({
    route,
    state: "pending",
    bytes: 0,
  }));
  const startedAt = Date.now();
  let totalBytes = 0;
  let phase: PreparePhase = "worker";

  // 조각이 올 때마다 그리면 화면이 과하게 다시 그려진다 — 조금씩 모아서 알린다
  const REPORT_INTERVAL_MS = 120;
  let lastReportAt = 0;

  const report = (force = false) => {
    if (onProgress === undefined) return;
    const now = Date.now();
    if (!force && now - lastReportAt < REPORT_INTERVAL_MS) return;
    lastReportAt = now;

    // 0 으로 나누지 않도록 최소 시간을 둔다
    const elapsedSeconds = Math.max((now - startedAt) / 1000, 0.05);
    onProgress({
      phase,
      routes: routes.map((item) => ({ ...item })),
      done: routes.filter((item) => item.state === "done").length,
      total: routes.length,
      bytes: totalBytes,
      bytesPerSecond: totalBytes / elapsedSeconds,
    });
  };

  // 서비스 워커가 요청을 가로채 캐시에 담으므로, 살아나고 이 화면을 맡은 뒤에 받아야 한다.
  // 이 구간이 길 수 있어(앱 파일 설치) 별도 걸음으로 알린다.
  report(true);
  await navigator.serviceWorker.ready;
  await waitUntilControlled();

  phase = "download";
  report(true);

  for (const item of routes) {
    item.state = "downloading";
    report(true);
    try {
      await downloadRoute(item, (bytes) => {
        totalBytes += bytes;
        report();
      });
      item.state = "done";
    } catch {
      // 한 화면이 실패해도 나머지는 계속 받는다
      item.state = "failed";
    }
    report(true);
  }

  phase = "save";
  report(true);

  return waitUntilSaved();
}
