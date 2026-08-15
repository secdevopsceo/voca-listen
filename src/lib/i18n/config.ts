/**
 * i18n 공통 상수 (서버·클라이언트 양쪽에서 쓴다)
 *
 * 🚨 이 파일에는 next/headers 같은 서버 전용 모듈을 절대 import 하지 않는다.
 * 화면(클라이언트 컴포넌트)이 쿠키 이름을 알아야 해서, 서버 전용 코드가 섞이면
 * 클라이언트 번들에 딸려 들어가 빌드가 깨진다(제5장 "Zod (유효성 검증)" 의
 * "서버 전용 코드 격리" 와 같은 취지).
 */

export const SUPPORTED_LOCALES = ["ko", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** 키가 없을 때 기대는 언어 — 영어(제3장 "fallback 값은 항상 영어" 와 같은 방향) */
export const FALLBACK_LOCALE: SupportedLocale = "en";

/** 로케일을 담는 쿠키 이름 — 인증 토큰과는 아무 상관 없는 값이다 */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isSupportedLocale(value: string | undefined): value is SupportedLocale {
  return value !== undefined && SUPPORTED_LOCALES.includes(value as SupportedLocale);
}
