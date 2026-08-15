/**
 * 저장소 키 단일 정의
 * 계획서 "저장 데이터 구조" — 키 접두사는 voca-listen 하나로 통일한다.
 * 다른 파일에서 문자열을 직접 쓰지 않고 반드시 여기서 import 한다.
 */

const PREFIX = "voca-listen";

export const STORAGE_KEYS = {
  schemaVersion: `${PREFIX}:schema-version`,
  wordbooks: `${PREFIX}:wordbooks`,
  words: `${PREFIX}:words`,
  wordRecords: `${PREFIX}:word-records`,
  quizResults: `${PREFIX}:quiz-results`,
  settings: `${PREFIX}:settings`,
  meta: `${PREFIX}:meta`,
} as const;

/**
 * 저장 구조 버전.
 * 🚨 저장 항목의 형태가 바뀌면 이 값을 올리고 _client 의 마이그레이션에 항목을 추가한다.
 * (insight-sbom 의 redux-persist version/migrate 사고 교훈 — 낡은 저장분이 조용히
 *  되살아나 지금 타입과 어긋나는 것을 막는다.)
 */
export const SCHEMA_VERSION = 2;

/** 글로비시 시드 버전 — 시드 내용이 바뀌면 올린다. */
export const SEED_VERSION = 2;
