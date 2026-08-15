/**
 * 저장소에서 읽어온 값을 화면에 붙여주는 훅
 *
 * localStorage 는 브라우저에만 있으므로 첫 렌더에서는 읽지 않고(서버와 모양을 맞춘다),
 * 화면이 뜬 뒤에 읽는다.
 * 다시 읽는 때는 두 가지다 — Redux 의 revision 이 오를 때(데이터가 바뀜),
 * 그리고 deps 로 넘긴 값이 바뀔 때(찾는 조건이 바뀜).
 */

"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";

export function useStoredData<T>(
  read: () => T,
  deps: unknown[] = [],
): { data: T | null; isReady: boolean } {
  const revision = useAppSelector((state) => state.ui.revision);
  const [data, setData] = useState<T | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setData(read());
    setIsReady(true);
    // read 는 매 렌더 새로 만들어지는 함수라 의존성에서 뺀다.
    // 다시 읽을 때는 revision 이 오르거나 deps 가 바뀐다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, ...deps]);

  return { data, isReady };
}
