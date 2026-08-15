/**
 * 듣기 학습 순서 규칙 (계획서 6-3)
 *
 * 🚨 예전에는 저장된 차례(가나다순) 그대로여서 **항상 `a` 부터** 시작했다.
 *    앞쪽 단어만 반복해 듣게 되는 것이 이번 작업의 출발점이다.
 *
 * | 순위 | 대상 | 그 안에서의 순서 |
 * |------|------|------------------|
 * | 1 | 틀린 적 있는 단어 | 많이 틀린 순 |
 * | 2 | 한 번도 시험 안 본 단어 | 중요도 높은 순 |
 * | 3 | 맞혔던 단어 | 복습할 때가 된 순(다음 복습 시각 이른 순) |
 */

/** 순서를 정하는 데 필요한 값만 받는다 — 화면 타입에 매이지 않게 */
export interface OrderableWord {
  wrongCount: number;
  lastTestedAt: string | null;
  nextReviewAt: string | null;
  importance: number;
  term: string;
}

/** 세 무리 중 어디에 드는가 (작을수록 먼저 듣는다) */
function groupOf(word: OrderableWord): number {
  if (word.wrongCount > 0) return 1;
  if (word.lastTestedAt === null) return 2;
  return 3;
}

/**
 * 동점일 때 쓰는 순서값.
 *
 * 🚨 알파벳순으로 두면 안 된다. 시험을 한 번도 안 본 첫 사용 때는 모든 단어가 같은 무리라
 *    동점 처리가 그대로 전체 순서가 되고, 중요도 5인 `a` 가 맨 앞으로 와
 *    **여전히 a 부터 시작**한다(실제로 그렇게 나와 고쳤다).
 *    글자에서 뽑은 값으로 섞되 같은 단어는 늘 같은 값이라, 순서가 실행마다 흔들리지 않는다.
 */
function scatterKey(term: string): number {
  let hash = 2166136261;
  for (let i = 0; i < term.length; i += 1) {
    hash ^= term.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * 듣기 순서대로 늘어놓는다. 원본 배열은 건드리지 않는다.
 * 같은 조건이면 위 scatterKey 로 흩어 놓는다(알파벳순이 되지 않게).
 */
export function orderForListening<T extends OrderableWord>(words: T[]): T[] {
  return [...words].sort((a, b) => {
    const groupDiff = groupOf(a) - groupOf(b);
    if (groupDiff !== 0) return groupDiff;

    const group = groupOf(a);
    if (group === 1) {
      // 많이 틀린 것부터
      if (a.wrongCount !== b.wrongCount) return b.wrongCount - a.wrongCount;
    } else if (group === 2) {
      // 자주 쓰는 단어부터
      if (a.importance !== b.importance) return b.importance - a.importance;
    } else {
      // 복습할 때가 된 것부터. 시각이 없으면 뒤로 민다
      const left = a.nextReviewAt ?? "9999";
      const right = b.nextReviewAt ?? "9999";
      if (left !== right) return left.localeCompare(right);
    }

    return scatterKey(a.term) - scatterKey(b.term);
  });
}
