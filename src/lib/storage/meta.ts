/**
 * 앱 메타 저장소 (1행)
 * 글로비시 시드를 이미 넣었는지 표시해 두 번 넣지 않게 한다.
 * 함수명 prefix 는 select / selectList / insert / update / delete 5종만 쓴다.
 */

import { nowIso, readJson, writeJson } from "./_client";
import { STORAGE_KEYS } from "./_keys";
import type { AppMeta } from "./_types";

/** 메타 읽기 — 아직 없으면 "시드를 넣은 적 없음" 상태를 돌려준다 */
export function selectMeta(): AppMeta {
  const now = nowIso();
  const fallback: AppMeta = {
    id: 1,
    createdAt: now,
    updatedAt: now,
    seedVersion: 0,
    seededAt: null,
  };
  const stored = readJson<AppMeta | null>(STORAGE_KEYS.meta, null);
  if (stored === null) return fallback;
  return { ...fallback, ...stored, id: 1 };
}

/** 시드를 넣었다고 표시 */
export function insertMeta(seedVersion: number): AppMeta {
  const now = nowIso();
  const row: AppMeta = {
    id: 1,
    createdAt: now,
    updatedAt: now,
    seedVersion,
    seededAt: now,
  };
  writeJson(STORAGE_KEYS.meta, row);
  return row;
}

/** 메타 고치기 */
export function updateMeta(patch: Partial<Omit<AppMeta, "id" | "createdAt">>): AppMeta {
  const current = selectMeta();
  const next: AppMeta = { ...current, ...patch, id: 1, updatedAt: nowIso() };
  writeJson(STORAGE_KEYS.meta, next);
  return next;
}
