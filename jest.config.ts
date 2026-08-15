import type { Config } from "jest";
import nextJest from "next/jest.js";

/**
 * Jest 설정 (default-rules.md 제5장 "테스트 (Jest)")
 * - 변환은 next/jest(Next 내장 SWC) — 별도 babel 설정을 만들지 않는다
 * - 테스트는 원본 파일 바로 옆에 둔다(코로케이션) — __tests__ 폴더 금지
 * - 이 앱의 저장소는 localStorage 라서 jsdom 환경을 쓴다
 * - 시각에 좌우되지 않도록 TZ=UTC 로 실행한다(package.json 의 test 스크립트)
 */
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // 원본 옆에 둔 *.test.ts 를 전부 모은다
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  clearMocks: true,
};

export default createJestConfig(config);
