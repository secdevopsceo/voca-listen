/**
 * 망각곡선 규칙 테스트
 * 계획서 "맞히면 단계를 올리고, 틀리면 1로 되돌린다" 를 확인한다.
 */

import type { WordRecord } from "@/lib/storage/_types";
import {
  MAX_REVIEW_STAGE,
  REVIEW_INTERVAL_DAYS,
  calcAccuracy,
  calcNextReviewAt,
  calcNextStage,
  isDueForReview,
  isMastered,
} from "./review";

function makeRecord(overrides: Partial<WordRecord> = {}): WordRecord {
  return {
    id: "record-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    wordId: "word-1",
    correctCount: 0,
    wrongCount: 0,
    unknownCount: 0,
    lastTestedAt: null,
    reviewStage: 0,
    nextReviewAt: null,
    ...overrides,
  };
}

describe("calcNextStage", () => {
  it("맞히면 단계가 1씩 오른다", () => {
    expect(calcNextStage(0, true)).toBe(1);
    expect(calcNextStage(1, true)).toBe(2);
    expect(calcNextStage(2, true)).toBe(3);
    expect(calcNextStage(3, true)).toBe(4);
    expect(calcNextStage(4, true)).toBe(5);
  });

  it("가장 높은 단계에서 더 맞혀도 그 위로는 오르지 않는다", () => {
    expect(calcNextStage(MAX_REVIEW_STAGE, true)).toBe(MAX_REVIEW_STAGE);
  });

  it("틀리면 어느 단계에 있든 1 로 되돌아간다", () => {
    expect(calcNextStage(0, false)).toBe(1);
    expect(calcNextStage(3, false)).toBe(1);
    expect(calcNextStage(MAX_REVIEW_STAGE, false)).toBe(1);
  });
});

describe("calcNextReviewAt", () => {
  const base = "2026-03-10T00:00:00.000Z";

  it("단계별로 1·3·7·14·30일 뒤가 된다", () => {
    expect(calcNextReviewAt(1, base)).toBe("2026-03-11T00:00:00.000Z");
    expect(calcNextReviewAt(2, base)).toBe("2026-03-13T00:00:00.000Z");
    expect(calcNextReviewAt(3, base)).toBe("2026-03-17T00:00:00.000Z");
    expect(calcNextReviewAt(4, base)).toBe("2026-03-24T00:00:00.000Z");
    expect(calcNextReviewAt(5, base)).toBe("2026-04-09T00:00:00.000Z");
  });

  it("단계 0 은 그 자리 그대로다(아직 안 본 상태)", () => {
    expect(calcNextReviewAt(0, base)).toBe(base);
  });

  it("범위를 벗어난 단계는 가장 가까운 값으로 맞춘다", () => {
    expect(calcNextReviewAt(-5, base)).toBe(calcNextReviewAt(0, base));
    expect(calcNextReviewAt(99, base)).toBe(calcNextReviewAt(MAX_REVIEW_STAGE, base));
  });

  it("단계별 날 수 표가 계획서와 같다", () => {
    expect([...REVIEW_INTERVAL_DAYS]).toEqual([0, 1, 3, 7, 14, 30]);
  });
});

describe("isDueForReview", () => {
  it("복습 예정 시각이 지났으면 복습할 때다", () => {
    const record = makeRecord({ nextReviewAt: "2026-03-10T00:00:00.000Z" });
    expect(isDueForReview(record, "2026-03-11T00:00:00.000Z")).toBe(true);
  });

  it("복습 예정 시각이 아직 오지 않았으면 아니다", () => {
    const record = makeRecord({ nextReviewAt: "2026-03-20T00:00:00.000Z" });
    expect(isDueForReview(record, "2026-03-11T00:00:00.000Z")).toBe(false);
  });

  it("예정 시각이 없으면 바로 복습 대상이다", () => {
    expect(isDueForReview(makeRecord(), "2026-03-11T00:00:00.000Z")).toBe(true);
  });
});

describe("isMastered", () => {
  it("가장 높은 단계에 이르면 다 외운 것으로 본다", () => {
    expect(isMastered(makeRecord({ reviewStage: MAX_REVIEW_STAGE }))).toBe(true);
  });

  it("그 아래 단계는 아직 아니다", () => {
    expect(isMastered(makeRecord({ reviewStage: MAX_REVIEW_STAGE - 1 }))).toBe(false);
  });
});

describe("calcAccuracy", () => {
  it("맞힌 비율을 반올림해 준다", () => {
    expect(calcAccuracy({ correctCount: 3, wrongCount: 1 })).toBe(75);
    expect(calcAccuracy({ correctCount: 1, wrongCount: 2 })).toBe(33);
  });

  it("한 번도 안 봤으면 0 이다(0 으로 나누지 않는다)", () => {
    expect(calcAccuracy({ correctCount: 0, wrongCount: 0 })).toBe(0);
  });
});
