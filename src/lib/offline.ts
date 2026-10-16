/**
 * 인터넷 없이 쓰기 위한 준비 (관제탑 PWA 견본 .claude/templates/pwa/offline/offline.ts 와 같은 코드 — 2026-10-15 옮김)
 * 출처: voca-listen src/lib/offline.ts (2026-08-14 커밋 fb9fd1d · f24d71c · 38c362d · ce68028 로 다듬은 판)
 *       + 2026-10-15 관제탑 PWA 규칙 정비에서 더한 것: HTML 요청 머리 · 같은 때 두 번 받지 않기 · startOfflineSync(새 서비스 워커·재연결 때 다시 받기)
 * 규칙: 관제탑 .claude/rules-detail/pwa.md "오프라인형 PWA"
 *
 * 서비스 워커(next.config 의 pages 규칙)가 한 번 받아 본 화면을 캐시에 담아 두므로,
 * 여기서 화면들을 미리 한 번씩 받아 두면 비행기모드에서도 그대로 열린다.
 *
 * 🚨 화면을 새로 만들면 OFFLINE_ROUTES 에 반드시 추가한다. 빠뜨리면 offline-routes.test.ts 가 실패한다.
 * 🚨 언어를 바꾸는 곳(설정 화면 등)에서는 바꾼 뒤 prepareOffline() 을 한 번 부른다 — 저장된 화면이 옛 언어로 남지 않게.
 */

/** 인터넷 없이도 열려야 하는 화면들 — 🚨 프로젝트의 화면 경로로 바꾼다 */
export const OFFLINE_ROUTES = [
  "/ui/wordbooks",
  "/ui/wordbooks/trash",
  "/ui/listen",
  "/ui/quiz",
  "/ui/stats",
  "/ui/settings",
];

/** 화면 파일은 있지만 미리 받지 않는 주소와 그 이유 — 넘겨 주기만 하는 화면 등(offline-routes.test.ts 가 읽는다) */
export const OFFLINE_ROUTES_EXCLUDED: Record<string, string> = {
  "/": "redirects to /ui/wordbooks",
};

/** 서비스 워커가 화면을 담아 두는 캐시 이름 — next.config 의 pages 규칙 cacheName 과 같아야 한다 */
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
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof caches !== "undefined";
}

/** 지금 오프라인 준비가 얼마나 됐는지 확인한다. 아무것도 바꾸지 않는다 */
export async function checkOfflineStatus(): Promise<OfflineStatus> {
  const total = OFFLINE_ROUTES.length;
  if (!canUseOffline()) return { workerReady: false, saved: 0, total };

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.active == null) return { workerReady: false, saved: 0, total };

  const cache = await caches.open(PAGES_CACHE);
  // 저장된 응답에는 Vary 헤더가 붙어 있어 ignoreVary 없이는 찾지 못할 수 있다
  const found = await Promise.all(OFFLINE_ROUTES.map((route) => cache.match(route, { ignoreVary: true })));

  return { workerReady: true, saved: found.filter((response) => response !== undefined).length, total };
}

/**
 * 서비스 워커가 이 화면의 요청을 실제로 맡을 때까지 기다린다.
 *
 * 🚨 없으면 첫 준비가 조용히 실패한다 — 홈 화면 앱을 처음 열면 서비스 워커가 살아나긴 해도
 *    아직 이 화면을 "맡기 전"이라, 그 사이에 보낸 요청은 서비스 워커를 그냥 지나쳐 캐시에 담기지 않는다
 *    (voca-listen 에서 「준비하기」를 두 번 눌러야 되던 증상). next.config 의 clientsClaim 덕에 곧 맡게 된다.
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
 * 🚨 없으면 "화면 2/6개 저장됨" 처럼 덜 센 값이 나온다 — workbox 는 응답을 화면에 먼저 돌려주고
 *    캐시 쓰기는 뒤에서 이어서 한다(fetchAndCachePut 이 cachePut 을 기다리지 않는다). 느린 실제 폰에서만 드러났다.
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
 * 🚨 worker 걸음을 따로 두는 이유: 서비스 워커가 앱 파일을 다 받아 설치를 마쳐야 화면 받기를 시작할 수 있다.
 *    이걸 download 와 뭉뚱그리면 "0/6 · 0 B" 가 한참 떠 있어 멈춘 것처럼 보인다.
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
 * 한 화면을 받으면서 진행 상황을 알린다. 스트림으로 조금씩 읽어야 "얼마나 왔는지"를 실시간으로 알 수 있다.
 * 🚨 Accept: text/html — next.config 의 pages 규칙은 HTML 요청만 받는다. 이 머리가 없으면 받기는 해도 화면 상자에 담기지 않는다.
 */
async function downloadRoute(item: RouteProgress, onChunk: (bytes: number) => void): Promise<void> {
  const response = await fetch(item.route, { credentials: "same-origin", headers: { Accept: "text/html" } });
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

/** 지금 받는 중인 준비 — 같은 때 두 번 받지 않는다(앱이 스스로 받는 것과 「준비하기」 버튼이 겹칠 수 있다) */
let running: Promise<OfflineStatus> | null = null;
const listeners = new Set<(progress: PrepareProgress) => void>();

/**
 * 화면들을 한 번씩 받아 캐시에 담는다. onProgress 로 진행 상황을 계속 알려 준다.
 *
 * 🚨 인터넷이 없으면 요청을 아예 던지지 않는다 — 비행기모드에서 요청을 던지면 iOS 가
 *    "데이터에 접근하려면 에어플레인 모드를 끄거나 Wi-Fi를 사용하십시오" 알림을 띄운다.
 * 🚨 한 번에 하나씩 받는다. 동시에 던지면 무엇이 어디까지 왔는지 보여줄 수 없고, 휴대폰 회선에서는 서로 대역폭을 나눠 가져
 *    "한참 멈춘 것처럼" 보였다.
 * 🚨 본문을 끝까지 읽는다. 헤더만 받고 끝내면 서비스 워커가 캐시에 옮겨 쓰는 일이 한참 뒤에야 끝나 숫자가 덜 나온다.
 * 이미 받는 중이면 새로 시작하지 않고, 진행 상황을 함께 듣다가 같은 결과를 돌려준다.
 */
export function prepareOffline(onProgress?: (progress: PrepareProgress) => void): Promise<OfflineStatus> {
  if (onProgress) listeners.add(onProgress);
  if (running === null) {
    running = runPrepare().finally(() => {
      running = null;
      listeners.clear();
    });
  }
  return running;
}

async function runPrepare(): Promise<OfflineStatus> {
  if (!canUseOffline() || !navigator.onLine) return checkOfflineStatus();

  const routes: RouteProgress[] = OFFLINE_ROUTES.map((route) => ({ route, state: "pending", bytes: 0 }));
  const startedAt = Date.now();
  let totalBytes = 0;
  let phase: PreparePhase = "worker";

  // 조각이 올 때마다 그리면 화면이 과하게 다시 그려진다 — 조금씩 모아서 알린다
  const REPORT_INTERVAL_MS = 120;
  let lastReportAt = 0;

  const report = (force = false) => {
    if (listeners.size === 0) return;
    const now = Date.now();
    if (!force && now - lastReportAt < REPORT_INTERVAL_MS) return;
    lastReportAt = now;

    // 0 으로 나누지 않도록 최소 시간을 둔다
    const elapsedSeconds = Math.max((now - startedAt) / 1000, 0.05);
    const progress: PrepareProgress = {
      phase,
      routes: routes.map((item) => ({ ...item })),
      done: routes.filter((item) => item.state === "done").length,
      total: routes.length,
      bytes: totalBytes,
      bytesPerSecond: totalBytes / elapsedSeconds,
    };
    for (const listener of listeners) listener(progress);
  };

  // 서비스 워커가 요청을 가로채 캐시에 담으므로, 살아나고 이 화면을 맡은 뒤에 받아야 한다
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

/**
 * 앱이 열려 있는 동안 알아서 화면을 받아 두게 한다 — 앱의 맨 바깥 부품에서 useEffect 로 한 번 부르고, 돌려받은 함수로 끈다.
 *
 * 받는 때
 *   1. 서비스 워커가 준비되면(앱을 열 때)
 *   2. 인터넷이 다시 연결되면(비행기모드를 껐을 때)
 *   3. 🚨 새 서비스 워커가 자리를 잡으면(새 버전 배포 뒤) — 저장된 화면을 새 버전으로 바꿔 두지 않으면, 열어 둔 옛 화면에서
 *      인터넷 없이 탭을 옮길 때 지워진 옛 조각을 찾다 깨질 수 있다(관제탑 pwa-check 의 update 장면이 본다)
 * 🚨 인터넷이 없으면 요청을 던지지 않는다(아이폰 비행기모드 경고 창). 첫 화면 그리기를 방해하지 않도록 한가할 때 받는다.
 */
export function startOfflineSync(): () => void {
  if (!canUseOffline()) return () => undefined;

  const warm = () => {
    if (!navigator.onLine) return;
    const run = () => void prepareOffline();
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run);
    else window.setTimeout(run, 2000);
  };

  void navigator.serviceWorker.ready.then(warm).catch(() => undefined);
  window.addEventListener("online", warm);
  navigator.serviceWorker.addEventListener("controllerchange", warm);

  return () => {
    window.removeEventListener("online", warm);
    navigator.serviceWorker.removeEventListener("controllerchange", warm);
  };
}
