/**
 * redux-persist 저장소 — 브라우저에서는 localStorage, 서버(SSR)에서는 아무것도 하지 않는다.
 * (insight-sbom 과 같은 방식 — 서버에서 localStorage 를 건드려 터지는 것을 막는다.)
 */

import createWebStorage from "redux-persist/lib/storage/createWebStorage";

const createNoopStorage = () => ({
  getItem: (_key: string) => Promise.resolve(null),
  setItem: (_key: string, value: string) => Promise.resolve(value),
  removeItem: (_key: string) => Promise.resolve(),
});

const storage =
  typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage();

export default storage;
