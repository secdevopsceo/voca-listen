/**
 * voca-listen 의 next.config — PWA 부분은 관제탑 견본(.claude/templates/pwa/offline/next.config.pwa.ts)과 같은 코드다(2026-10-15 옮김)
 * 출처: voca-listen next.config.ts (2026-08-14 커밋 346938a · 38c362d · 385440d · 2026-10-15 f8e0007)
 * 규칙: 관제탑 .claude/rules-detail/pwa.md "오프라인형 PWA" · "PWA 공통 함정"
 *
 * 🚨 붙이는 법: 아래 withPWA 를 프로젝트 next.config.ts 에 그대로 옮기고, 기존 설정을 감싼다.
 *    예) export default withPWA(withNextIntl(nextConfig));
 *    package.json 의 build 스크립트에 --webpack 을 붙인다(아래 '빌드 도구' 주석).
 */

import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * 화면 상자에 담아 둘 화면 개수. 화면 수의 몇 배로 넉넉하게 둔다.
 *
 * 🚨 보관 기간(maxAgeSeconds)은 일부러 두지 않는다 — 담아 둔 화면은 만료되지 않는다.
 *    기간을 두면 그만큼 오래 인터넷 없이만 쓴 사람은 어느 날 갑자기 앱이 안 열린다(next-pwa 기본값은 24시간).
 *    낡은 내용이 남을 걱정은 없다. 화면 규칙이 NetworkFirst 라 인터넷만 있으면 늘 새로 받아 덮어쓰고,
 *    앱 코드는 서비스 워커 갱신 + cleanupOutdatedCaches 가 정리한다.
 */
const OFFLINE_CACHE_ENTRIES = 64;

/**
 * 폰트 조각 보관 개수.
 * 🚨 한글 웹폰트는 글자 범위별로 수백 조각으로 나뉜다. 미리 받기에서 뺀 대신(아래 exclude) 실제로 받은 조각을 들고 있어야 한다.
 *    300 으로 두었던 voca-listen 은 첫 화면 하나만 열어도 296~351개가 담겨 한도를 넘었다
 *    (2026-10-15 관제탑 PWA 합격 시험기 실측 · voca-listen 고친 판 · 화면 2개). 넘으면 먼저 받은 조각이 밀려나
 *    인터넷 없이 열었을 때 글꼴이 시스템 글꼴로 바뀐다. 빌드의 woff2 파일 수보다 크게 둔다.
 */
const FONT_CACHE_ENTRIES = 1000;

/**
 * PWA — 휴대폰에 설치해 인터넷 없이도 쓰기 위한 설정.
 *
 * 🚨 개발 중에는 끈다. 서비스 워커가 캐시를 붙들고 있으면 고친 내용이 화면에 안 나온다.
 * 🚨 빌드 도구: next-pwa 는 webpack 플러그인이라 Next 16 기본 빌드 도구(Turbopack)에서는 서비스 워커가 만들어지지 않는다.
 *    그래서 package.json 의 build 스크립트에 --webpack 을 붙인다(개발 서버는 Turbopack 그대로).
 *    이 플래그를 빼면 오류 없이 서비스 워커만 사라진다 — 관제탑 pwa-check 의 sw_served 가 잡는다.
 * 🚨 workboxOptions.navigateFallback 을 넣지 말 것. 넘긴 주소가 미리 받은 목록에 없으면 서비스 워커 본문이 그 자리에서 멈춰,
 *    설치와 화면 맡기는 되지만 캐시 규칙이 하나도 등록되지 않는다 — 인터넷이 끊기면 모든 화면이 브라우저 오류가 된다
 *    (2026-10-15 시험기로 재현 · voca-listen 5c64ae0). 오프라인 안내 화면은 src/app/~offline/page.tsx 로 두면
 *    next-pwa 가 알아서 미리 받는다.
 * 🚨 사용자 캐시 규칙은 next-pwa 기본 규칙보다 «앞»에 놓인다(next-pwa 10.2.9 resolveRuntimeCaching — 같은 cacheName 의 기본 규칙은 빠진다).
 *    그래서 pages 규칙을 기본값처럼 '같은 출처 전부'로 두면 그림·스크립트까지 화면 상자에 담겨 화면이 밀려난다.
 *    아래 pages 규칙은 HTML 요청(화면 이동 · Accept: text/html)만 받는다. 화면 미리 받기(offline.ts)도 Accept: text/html 로 보낸다.
 */
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // 🚨 '다시 연결되면 새로고침'은 끈다(next-pwa 기본값은 켜짐). 켜 두면 인터넷이 끊겼다 이어질 때마다 화면이 새로고침되어
  //    화면 메모리에만 있는 진행 상태(시험·입력·재생 위치)가 사라진다. 새 버전 교체는 skipWaiting·clientsClaim 이 맡는다.
  reloadOnOnline: false,
  // 기본 캐시 규칙은 그대로 두고, cacheName 이 같은 항목만 아래 것으로 갈아끼운다
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    // 새 버전을 받으면 바로 자리를 잡는다 — 바뀐 직후 화면을 다시 받아 두는 일은 offline.ts 의 startOfflineSync 가 한다
    skipWaiting: true,
    clientsClaim: true,
    /**
     * 🚨 설치할 때 미리 받을 파일에서 폰트 조각을 뺀다(한글 폰트 670조각 8.1MB 를 미리 받느라 설치가 2분 가까이 걸렸다).
     * 앞 세 줄은 next-pwa 기본값이다 — exclude 를 지정하면 통째로 갈아끼워지므로 같이 적는다.
     * 🚨 마지막 줄에 `/_next/` 를 넣지 말 것. workbox 는 웹팩 자산 이름(`static/media/...`)으로 거른다.
     */
    exclude: [/\/_next\/static\/.*(?<!\.p)\.woff2/, /\.map$/, /^manifest.*\.js$/, /media\/.*\.woff2$/],
    runtimeCaching: [
      {
        // 폰트 — 미리 받지 않는 대신 실제로 받은 조각을 오래 들고 있는다(기본값 4개 · 7일)
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-font-assets",
          expiration: { maxEntries: FONT_CACHE_ENTRIES },
        },
      },
      {
        // 미리 받아 두는 화면 조각 (RSC prefetch) — 조건은 next-pwa 기본값과 같고 보관 기간만 없앴다
        urlPattern: ({ request, url, sameOrigin }) =>
          sameOrigin &&
          request.headers.get("RSC") === "1" &&
          request.headers.get("Next-Router-Prefetch") === "1" &&
          !url.pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-rsc-prefetch",
          expiration: { maxEntries: OFFLINE_CACHE_ENTRIES },
        },
      },
      {
        // 앱 안에서 화면을 옮길 때 받는 화면 조각 (RSC)
        urlPattern: ({ request, url, sameOrigin }) =>
          sameOrigin && request.headers.get("RSC") === "1" && !url.pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-rsc",
          expiration: { maxEntries: OFFLINE_CACHE_ENTRIES },
        },
      },
      {
        // 화면 HTML — 홈 화면 아이콘으로 처음 열거나 새로고침할 때, 그리고 화면 미리 받기(Accept: text/html)
        urlPattern: ({ request, url, sameOrigin }) =>
          sameOrigin &&
          !url.pathname.startsWith("/api/") &&
          (request.mode === "navigate" || (request.headers.get("Accept") ?? "").includes("text/html")),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: OFFLINE_CACHE_ENTRIES },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {};

// 로케일은 URL 이 아니라 쿠키·헤더로 정한다(src/lib/i18n/request.ts)
const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

export default withPWA(withNextIntl(nextConfig));
