/**
 * 초기화 규칙 계산
 * 계획서 데이터 변화 행위 12(점수만 지우기) 담당.
 *
 * 🚨 이 파일이 지키는 가장 중요한 약속:
 * **단어와 단어장은 하나도 지우지 않는다.** 글로비시로 되돌리지도 않는다.
 * 지우는 것은 시험 기록 · 학습 기록 · 별표 세 가지뿐이다(대표 확정 사항).
 */

import { runInTransaction } from "@/lib/storage/_client";
import * as quizResultStorage from "@/lib/storage/quiz-results";
import * as recordStorage from "@/lib/storage/word-records";
import * as wordbookStorage from "@/lib/storage/wordbooks";
import * as wordStorage from "@/lib/storage/words";
import { ok, type ServiceResult } from "./_result";
import type { ResetScoresResult } from "./reset.types";

/**
 * 행위 12 — 점수만 지우기
 *
 * 1) 시험 기록 전부 삭제 → 통계의 날짜별 그래프가 비워진다
 * 2) 학습 기록 전부 삭제 → 모든 단어가 "아직 안 본 단어" 가 된다
 * 3) 별표 전부 해제
 * 단어·단어장·휴지통 내용은 건드리지 않는다.
 */
export function resetScores(): ServiceResult<ResetScoresResult> {
  const result = runInTransaction(() => {
    const deletedQuizResultCount = quizResultStorage.deleteAllQuizResults();
    const deletedWordRecordCount = recordStorage.deleteAllWordRecords();

    // 별표가 켜진 단어만 골라 끈다(휴지통에 있는 것도 함께 — 되살렸을 때 남아 있지 않게)
    const starredIds = wordStorage
      .selectListWords({ includeDeleted: true })
      .filter((word) => word.starred)
      .map((word) => word.id);
    const unstarredWordCount = wordStorage.updateWords(starredIds, { starred: false });

    return { deletedQuizResultCount, deletedWordRecordCount, unstarredWordCount };
  });

  return ok({
    ...result,
    // 초기화 뒤에도 그대로 남아 있는 수 — 화면이 "단어는 안 지워졌어요" 를 보여주는 근거
    keptWordCount: wordStorage.selectWordCount(),
    keptWordbookCount: wordbookStorage.selectWordbookCount(),
  });
}
