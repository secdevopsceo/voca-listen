/**
 * 화면 목록 시험 (관제탑 견본 — .claude/templates/pwa/offline/offline-routes.test.ts · offline.ts 옆에 둔다)
 * 규칙: 관제탑 .claude/rules-detail/pwa.md "오프라인형 PWA" (계획서 docs/plans/pwa-rule.md 의 G15)
 *
 * 🚨 화면(page.tsx)을 새로 만들고 OFFLINE_ROUTES 에 넣지 않으면 이 시험이 실패한다 — 빠뜨린 화면은 인터넷 없이 안 열린다.
 *    미리 받지 않을 화면(넘겨 주기만 하는 화면 등)은 OFFLINE_ROUTES_EXCLUDED 에 이유와 함께 적는다.
 */

import fs from "node:fs";
import path from "node:path";
import { OFFLINE_ROUTES, OFFLINE_ROUTES_EXCLUDED } from "./offline";

/** src/app 아래의 page 파일을 모두 찾아 주소로 바꾼다 — (그룹) 폴더는 주소에 안 들어가고, [동적] 화면과 ~offline 은 뺀다 */
function pageRoutes(appDir: string): string[] {
  const routes: string[] = [];
  const walk = (dir: string, segments: string[]) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        // _비공개 폴더와 @병렬 경로는 주소가 아니다
        if (entry.name.startsWith("_") || entry.name.startsWith("@")) continue;
        const next = /^\(.*\)$/.test(entry.name) ? segments : [...segments, entry.name];
        walk(path.join(dir, entry.name), next);
      } else if (/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        routes.push(`/${segments.join("/")}`);
      }
    }
  };
  walk(appDir, []);
  return routes.filter((route) => !route.includes("[") && !route.startsWith("/~offline")).sort();
}

describe("OFFLINE_ROUTES — 인터넷 없이 열려야 하는 화면 목록", () => {
  const all = pageRoutes(path.join(process.cwd(), "src", "app"));

  it("화면 파일을 하나 이상 찾는다(경로를 잘못 짚으면 아래 시험이 빈 목록으로 통과해 버린다)", () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it("🚨 화면 파일이 있는 주소는 모두 미리 받거나, 빼는 이유가 적혀 있다", () => {
    const missing = all.filter((route) => !OFFLINE_ROUTES.includes(route) && !(route in OFFLINE_ROUTES_EXCLUDED));
    expect(missing).toEqual([]);
  });

  it("목록에 화면 파일이 없는 주소를 적지 않는다", () => {
    const unknown = OFFLINE_ROUTES.filter((route) => !all.includes(route));
    expect(unknown).toEqual([]);
  });
});
