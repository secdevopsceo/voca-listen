/**
 * next-intl 요청별 설정 (로케일 URL 비노출 방식)
 *
 * 주소에 /ko·/en 을 붙이지 않고 쿠키(NEXT_LOCALE)와 브라우저 언어로 정한다
 * (default-rules.md 제5장 "i18n (next-intl)" — URL 접두사 금지).
 * 지원하지 않는 언어면 영어로 떨어진다.
 *
 * 🚨 이 파일은 next/headers 를 쓰는 서버 전용 모듈이다.
 * 화면에서 쓸 상수는 여기가 아니라 ./config 에서 가져간다.
 */

import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  FALLBACK_LOCALE,
  LOCALE_COOKIE,
  isSupportedLocale,
  type SupportedLocale,
} from "./config";

/** Accept-Language 헤더에서 처음으로 지원하는 언어를 찾는다 */
function pickFromAcceptLanguage(header: string | null): SupportedLocale | null {
  if (header === null) return null;
  const tags = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter((tag) => tag !== "");

  for (const tag of tags) {
    const primary = tag.split("-")[0];
    if (isSupportedLocale(primary)) return primary;
  }
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: SupportedLocale;
  if (isSupportedLocale(stored)) {
    // 사용자가 직접 고른 언어가 가장 우선
    locale = stored;
  } else {
    const headerStore = await headers();
    locale = pickFromAcceptLanguage(headerStore.get("accept-language")) ?? FALLBACK_LOCALE;
  }

  const messages = (await import(`@/app/ui/i18n/${locale}.json`)).default;

  return { locale, messages };
});
