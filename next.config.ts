import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

// 로케일은 URL 이 아니라 쿠키·헤더로 정한다(src/lib/i18n/request.ts)
const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

/**
 * 캐시에 담아둘 화면 개수. 화면이 8개뿐이라 넉넉한 값이다.
 *
 * 🚨 보관 기간(maxAgeSeconds)은 일부러 두지 않는다 — 담아 둔 화면은 만료되지 않는다.
 *    기간을 두면 그만큼 오래 인터넷 없이만 쓴 사람은 어느 날 갑자기 앱이 안 열린다
 *    (기본 24시간 → 30일로 늘려 봤지만, 어차피 "언젠가 끊긴다"는 문제는 그대로다).
 *    낡은 내용이 남을 걱정은 없다. pages 규칙이 NetworkFirst 라 인터넷만 있으면
 *    항상 새로 받아 덮어쓰고, 앱 코드는 서비스 워커 갱신 + cleanupOutdatedCaches 가 정리한다.
 *    즉 기간 제한은 신선도에 아무 기여도 하지 않고 오프라인만 망가뜨린다.
 */
const OFFLINE_CACHE_ENTRIES = 64;

/**
 * PWA — 휴대폰에 설치해 인터넷 없이도 쓰기 위한 설정.
 *
 * 🚨 개발 중에는 끈다. 서비스 워커가 캐시를 붙들고 있으면 고친 내용이 화면에 안 나온다.
 * 🚨 데이터(단어·기록)는 전부 localStorage 에 있으므로 서비스 워커는 정적 자산만 다룬다.
 *    이 앱에는 서버 API 가 없어 캐시가 개인 정보를 품을 일이 없다.
 * 🚨 next-pwa 는 webpack 플러그인이라 Turbopack 빌드에서는 동작하지 않는다.
 *    그래서 package.json 의 build 스크립트에 --webpack 을 붙였다(개발 서버는 Turbopack 그대로).
 *    이 플래그를 빼면 서비스 워커가 만들어지지 않아 설치·오프라인이 조용히 사라진다.
 *
 * 🚨 workboxOptions.navigateFallback 을 다시 넣지 말 것 — 오프라인이 통째로 죽는다.
 *    navigateFallback 은 넘긴 주소가 "미리 저장(precache)된 것"이라고 전제하고 workbox 의
 *    createHandlerBoundToURL 을 부르는데, 그 구현이
 *      const key = getCacheKeyForURL(url); if (!key) throw new WorkboxError("non-precached-url")
 *    이라 목록에 없으면 sw.js 최상단에서 그대로 throw 한다.
 *    → 서비스 워커가 설치조차 못 하고, 뒤따르는 캐시 규칙도 전부 등록되지 않는다.
 *    → 인터넷이 있을 때는 브라우저가 그냥 네트워크로 가므로 멀쩡해 보이고,
 *       비행기모드에서만 먹통이 되어 원인을 찾기 어렵다.
 *    이 앱의 화면은 쿠키로 언어를 정하는 동적 렌더링이라 빌드 때 HTML 로 굳지 않으며,
 *    따라서 precache 목록(정적 자산 전용)에 절대 들어가지 않는다.
 *    오프라인 대체 화면은 src/app/~offline/page.tsx 로 두면 next-pwa 가 알아서 미리 저장한다.
 */
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // 새 버전을 받으면 바로 갈아끼워 옛 화면이 남지 않게 한다
  reloadOnOnline: true,
  // 기본 캐시 규칙은 그대로 두고, cacheName 이 같은 항목만 아래 것으로 갈아끼운다
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    /**
     * 🚨 설치할 때 미리 받을 파일에서 한글 폰트 조각을 뺀다.
     *
     * 한글 폰트는 글자 범위별로 잘려 670개(8.1MB)나 되는데, 이걸 전부 미리 받느라
     * 서비스 워커 설치가 2분 가까이 걸렸다. 그동안 「준비하기」는 아무 진척도
     * 보여줄 수 없어 멈춘 것처럼 보였다(설치가 끝나야 화면을 받기 시작한다).
     *
     * 브라우저는 원래 화면에 실제로 나온 글자의 조각만 받아 간다.
     * 그렇게 받은 폰트는 기본 규칙 static-font-assets(CacheFirst)가 캐시에 남기므로
     * 인터넷 없이도 그대로 쓰인다. 즉 미리 받을 이유가 없고 손해만 컸다.
     *
     * 앞 세 줄은 next-pwa 기본값이다 — exclude 를 지정하면 통째로 갈아끼워지므로 같이 적는다.
     * 🚨 마지막 줄에 `/_next/` 를 넣지 말 것. workbox 는 웹팩 자산 이름(`static/media/...`)으로
     *    거르기 때문에 `/_next/` 를 붙이면 하나도 걸리지 않는다(실제로 안 걸려 670개가 그대로 남았다).
     */
    exclude: [
      /\/_next\/static\/.*(?<!\.p)\.woff2/,
      /\.map$/,
      /^manifest.*\.js$/,
      /media\/.*\.woff2$/,
    ],
    // 기본 규칙과 조건은 똑같고, 보관 기간 제한을 없애고 개수만 늘린 것이다.
    // 기본값은 24시간 보관이라 하루만 안 열어도 캐시가 비어 비행기모드 실행이 깨졌다.
    runtimeCaching: [
      {
        /**
         * 폰트 — 미리 받지 않는 대신(위 exclude), 실제로 쓰인 조각을 오래 들고 있는다.
         *
         * 🚨 기본값이 4개·7일이다. 그대로 두면 한글 폰트 조각이 금세 밀려나
         *    인터넷 없이 열었을 때 글꼴이 시스템 기본 글꼴로 깨져 보인다.
         *    미리 받기를 껐으므로 이 한도를 반드시 같이 늘려야 한다.
         */
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-font-assets",
          expiration: {
            maxEntries: 300,
          },
        },
      },
      {
        // 미리 받아 두는 화면 조각 (RSC prefetch)
        urlPattern: ({ request, url, sameOrigin }) =>
          sameOrigin &&
          request.headers.get("RSC") === "1" &&
          request.headers.get("Next-Router-Prefetch") === "1" &&
          !url.pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-rsc-prefetch",
          expiration: {
            maxEntries: OFFLINE_CACHE_ENTRIES,
          },
        },
      },
      {
        // 아래 탭을 눌러 옮겨 다닐 때 받는 화면 조각 (RSC)
        urlPattern: ({ request, url, sameOrigin }) =>
          sameOrigin &&
          request.headers.get("RSC") === "1" &&
          !url.pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-rsc",
          expiration: {
            maxEntries: OFFLINE_CACHE_ENTRIES,
          },
        },
      },
      {
        // 홈 화면 아이콘으로 처음 열거나 새로고침할 때 받는 화면 (HTML)
        urlPattern: ({ url, sameOrigin }) => sameOrigin && !url.pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: {
            maxEntries: OFFLINE_CACHE_ENTRIES,
          },
        },
      },
    ],
  },
});

export default withPWA(withNextIntl(nextConfig));
