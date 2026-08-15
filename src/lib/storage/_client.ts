/**
 * localStorage 저수준 접근
 *
 * 이 파일만 window.localStorage 를 직접 만진다. 다른 storage 파일은 여기 함수를 쓴다.
 * 서버(SSR)에서는 localStorage 가 없으므로 모든 읽기가 기본값을 돌려주고 쓰기는 무시된다.
 */

import { SCHEMA_VERSION, STORAGE_KEYS } from "./_keys";

/** 브라우저 localStorage 의 일반적인 한도(약 5MB). 사용량 비율 계산에 쓴다. */
const ASSUMED_QUOTA_BYTES = 5 * 1024 * 1024;

/** 저장공간이 이 비율을 넘으면 화면에서 미리 경고한다(계획서 에지 케이스). */
export const STORAGE_WARN_RATIO = 0.8;

/** 저장공간이 가득 차 쓰기에 실패했을 때 던지는 에러 */
export class StorageQuotaError extends Error {
  constructor() {
    super("Storage quota exceeded");
    this.name = "StorageQuotaError";
  }
}

/** 브라우저에서 실행 중이고 localStorage 를 쓸 수 있는지 */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    // 쿠키·저장소가 차단된 환경
    return false;
  }
}

/**
 * 트랜잭션 버퍼.
 * runInTransaction 안에서는 쓰기가 여기에만 쌓이고, 블록이 정상으로 끝날 때
 * 한 번에 저장된다. 계획서 "데이터 변화" 의 1 행위 = 1 트랜잭션이 이것으로 성립한다.
 */
let txBuffer: Map<string, unknown> | null = null;

/**
 * 한 행위를 트랜잭션으로 묶는다.
 *
 * 블록 안의 쓰기는 메모리에만 쌓였다가 끝에서 한 번에 기록되므로,
 * 도중에 예외가 나면 저장소에는 아무것도 남지 않는다(절반만 바뀐 상태 방지).
 * 블록 안의 읽기는 아직 저장 전인 변경분을 함께 본다(방금 쓴 값을 바로 읽을 수 있다).
 */
export function runInTransaction<T>(fn: () => T): T {
  // 이미 트랜잭션 안이면 바깥 트랜잭션에 그대로 참여한다
  if (txBuffer !== null) return fn();

  txBuffer = new Map();
  let entries: Array<[string, unknown]>;
  try {
    const result = fn();
    entries = [...txBuffer.entries()];
    txBuffer = null;
    if (entries.length > 0) writeMany(entries);
    return result;
  } catch (error) {
    // 버퍼를 버리면 저장소는 손대지 않은 상태 그대로다
    txBuffer = null;
    throw error;
  }
}

/**
 * 키 하나를 읽어 JSON 으로 되돌린다.
 * 값이 없거나 깨져 있으면 fallback 을 돌려준다(앱이 죽지 않게).
 */
export function readJson<T>(key: string, fallback: T): T {
  // 트랜잭션 안에서 방금 쓴 값이 있으면 그것을 먼저 본다
  if (txBuffer !== null && txBuffer.has(key)) {
    return txBuffer.get(key) as T;
  }
  if (!isStorageAvailable()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // 깨진 값은 없는 것으로 본다 — 여기서 지우지는 않는다(사용자가 복구를 시도할 수 있게)
    return fallback;
  }
}

/**
 * 키 하나에 JSON 을 쓴다.
 * 트랜잭션 안이면 실제 저장 대신 버퍼에 쌓인다.
 */
export function writeJson(key: string, value: unknown): void {
  if (txBuffer !== null) {
    txBuffer.set(key, value);
    return;
  }
  writeMany([[key, value]]);
}

/**
 * 여러 키를 한꺼번에 쓴다 — 계획서 "데이터 변화" 의 1 행위 = 1 트랜잭션을 구현한다.
 *
 * 중간에 저장공간이 차서 실패하면 이미 쓴 키를 전부 원래 값으로 되돌려,
 * 그 행위의 변화가 절반만 남는 상태를 만들지 않는다.
 */
export function writeMany(entries: Array<[string, unknown]>): void {
  if (!isStorageAvailable()) return;

  // 되돌리기용으로 이전 값을 먼저 모아둔다
  const backup = entries.map(([key]) => [key, window.localStorage.getItem(key)] as const);
  const written: string[] = [];

  try {
    for (const [key, value] of entries) {
      window.localStorage.setItem(key, JSON.stringify(value));
      written.push(key);
    }
  } catch (error) {
    // 이미 쓴 것만 되돌린다
    for (const key of written) {
      const prev = backup.find(([backupKey]) => backupKey === key)?.[1] ?? null;
      if (prev === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, prev);
      }
    }
    if (isQuotaError(error)) throw new StorageQuotaError();
    throw error;
  }
}

/** 저장공간 부족으로 인한 실패인지 판정 (브라우저마다 이름이 달라 여러 경우를 본다) */
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    // Safari 사설 모드
    error.name === "QUOTA_EXCEEDED_ERR"
  );
}

/** 이 앱이 쓰는 키를 전부 지운다 (개발·복구용) */
export function clearAll(): void {
  if (!isStorageAvailable()) return;
  for (const key of Object.values(STORAGE_KEYS)) {
    window.localStorage.removeItem(key);
  }
}

/** 저장공간 사용량 */
export interface StorageUsage {
  /** 이 앱이 쓰고 있는 바이트 수 */
  usedBytes: number;
  /** 한도로 가정한 바이트 수 */
  quotaBytes: number;
  /** 0 ~ 1 사이의 사용 비율 */
  ratio: number;
  /** 경고선(80%)을 넘었는지 */
  isNearFull: boolean;
}

/** 이 앱이 차지하는 저장공간을 센다(통계 화면 표시용) */
export function selectStorageUsage(): StorageUsage {
  let usedBytes = 0;
  if (isStorageAvailable()) {
    for (const key of Object.values(STORAGE_KEYS)) {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        // UTF-16 기준 2바이트로 셈한다(브라우저 저장 방식에 맞춘 근사)
        usedBytes += (key.length + raw.length) * 2;
      }
    }
  }
  const ratio = usedBytes / ASSUMED_QUOTA_BYTES;
  return {
    usedBytes,
    quotaBytes: ASSUMED_QUOTA_BYTES,
    ratio,
    isNearFull: ratio >= STORAGE_WARN_RATIO,
  };
}

/**
 * 저장 구조 버전을 확인하고, 낡은 저장분이면 폐기한다.
 *
 * 🚨 insight-sbom 의 redux-persist 사고 교훈: 낡은 저장분을 그대로 되살리면
 * 지금 타입에 없는 값이 조용히 남아 화면이 죽거나 옛 데이터를 쓴다.
 * 버전이 다르면 복구하지 않고 비워서 시드부터 다시 시작한다.
 */
export function ensureSchemaVersion(): void {
  if (!isStorageAvailable()) return;
  const stored = readJson<number | null>(STORAGE_KEYS.schemaVersion, null);
  if (stored === SCHEMA_VERSION) return;
  if (stored !== null) {
    // 버전이 다르면 이 앱의 저장분을 폐기한다
    clearAll();
  }
  writeJson(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION);
}

/** 새 식별자 — 브라우저 기본 UUID 를 쓴다 */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 아주 오래된 환경을 위한 대비책
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 지금 시각을 UTC ISO 8601 문자열로 (제3장 "DB 시간대 = UTC+0") */
export function nowIso(): string {
  return new Date().toISOString();
}
