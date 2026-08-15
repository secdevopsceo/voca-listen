/**
 * 통계 집계 (읽기 전용 — 데이터를 바꾸지 않는다)
 * 계획서 "통계" 화면이 쓰는 값을 한 번에 만들어 준다.
 */

import { selectStorageUsage } from "@/lib/storage/_client";
import * as quizResultStorage from "@/lib/storage/quiz-results";
import * as recordStorage from "@/lib/storage/word-records";
import * as wordStorage from "@/lib/storage/words";
import { isDueForReview, isMastered } from "./review";
import type { DailyScorePoint, StatsSummary, StatsView } from "./stats.types";
import { listWords } from "./word";
import type { WordView } from "./word.types";

/** 오답 노트·별표 목록에 한 번에 보여줄 최대 개수 */
const LIST_LIMIT = 50;

/** 최근 시험 기록을 몇 개까지 보여줄지 */
const RECENT_QUIZ_LIMIT = 20;

/** 통계 화면이 쓰는 값 전부 */
export function getStats(nowIso: string = new Date().toISOString()): StatsView {
  const words = listWords();
  const records = recordStorage.selectListWordRecords();
  const quizResults = quizResultStorage.selectListQuizResults();

  const summary = buildSummary(words.length, records, quizResults.length, nowIso);

  // 오답 노트 — 틀린 적이 있는 단어를 틀린 횟수가 많은 순으로
  const weakWords = words
    .filter((word) => word.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount || a.accuracy - b.accuracy)
    .slice(0, LIST_LIMIT);

  const starredWords = words.filter((word) => word.starred).slice(0, LIST_LIMIT);

  return {
    summary,
    dailyScores: buildDailyScores(quizResults),
    recentQuizzes: quizResults.slice(0, RECENT_QUIZ_LIMIT),
    weakWords,
    starredWords,
    storage: selectStorageUsage(),
  };
}

function buildSummary(
  totalWordCount: number,
  records: ReturnType<typeof recordStorage.selectListWordRecords>,
  quizCount: number,
  nowIso: string,
): StatsSummary {
  let totalCorrectCount = 0;
  let totalWrongCount = 0;
  let totalUnknownCount = 0;
  let masteredWordCount = 0;
  let dueWordCount = 0;

  for (const record of records) {
    totalCorrectCount += record.correctCount;
    totalWrongCount += record.wrongCount;
    totalUnknownCount += record.unknownCount;
    if (isMastered(record)) masteredWordCount += 1;
    if (isDueForReview(record, nowIso)) dueWordCount += 1;
  }

  const answered = totalCorrectCount + totalWrongCount;

  return {
    totalWordCount,
    testedWordCount: records.length,
    masteredWordCount,
    dueWordCount,
    overallAccuracy: answered === 0 ? 0 : Math.round((totalCorrectCount / answered) * 100),
    totalCorrectCount,
    totalWrongCount,
    totalUnknownCount,
    quizCount,
  };
}

/**
 * 날짜별 평균 정답률.
 * 저장은 UTC 지만 사람이 보는 것은 현지 날짜이므로 현지 기준으로 묶는다
 * (제3장 "DB 시간대 = UTC+0" — 저장은 UTC, 표시 변환은 화면 쪽 몫).
 */
function buildDailyScores(
  quizResults: ReturnType<typeof quizResultStorage.selectListQuizResults>,
): DailyScorePoint[] {
  const byDate = new Map<string, { correct: number; total: number }>();

  for (const result of quizResults) {
    const date = toLocalDateString(result.finishedAt);
    const bucket = byDate.get(date) ?? { correct: 0, total: 0 };
    bucket.correct += result.correctCount;
    bucket.total += result.totalCount;
    byDate.set(date, bucket);
  }

  return [...byDate.entries()]
    .map(([date, bucket]) => ({
      date,
      accuracy: bucket.total === 0 ? 0 : Math.round((bucket.correct / bucket.total) * 100),
      totalCount: bucket.total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** UTC ISO 문자열을 현지 기준 YYYY-MM-DD 로 */
function toLocalDateString(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 오답 노트만 따로 (오답 노트 화면에서 쓴다) */
export function listWeakWords(limit: number = LIST_LIMIT): WordView[] {
  return listWords()
    .filter((word) => word.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount || a.accuracy - b.accuracy)
    .slice(0, limit);
}

/** 오늘 복습할 단어 */
export function listDueWords(nowIso: string = new Date().toISOString()): WordView[] {
  const records = recordStorage.selectListWordRecords();
  const dueIds = new Set(
    records.filter((record) => isDueForReview(record, nowIso)).map((record) => record.wordId),
  );
  return listWords().filter((word) => dueIds.has(word.id));
}

/** 아직 한 번도 안 본 단어 수 */
export function countUntestedWords(): number {
  const testedIds = new Set(
    recordStorage.selectListWordRecords().map((record) => record.wordId),
  );
  return wordStorage.selectListWords().filter((word) => !testedIds.has(word.id)).length;
}
