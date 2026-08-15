/**
 * 통계 service 의 화면 ↔ service 공유 타입
 */

import type { QuizResult } from "@/lib/storage/_types";
import type { StorageUsage } from "@/lib/storage/_client";
import type { WordView } from "./word.types";

/** 통계 화면 요약 */
export interface StatsSummary {
  /** 가진 단어 수 (휴지통 제외) */
  totalWordCount: number;
  /** 한 번이라도 시험 본 단어 수 */
  testedWordCount: number;
  /** 다 외운 단어 수 (복습 단계가 가장 높은 것) */
  masteredWordCount: number;
  /** 오늘 복습할 단어 수 */
  dueWordCount: number;
  /** 전체 정답률 0~100 */
  overallAccuracy: number;
  totalCorrectCount: number;
  totalWrongCount: number;
  /** 「모른다」를 고른 횟수 */
  totalUnknownCount: number;
  /** 시험 본 횟수 */
  quizCount: number;
}

/** 날짜별 점수 한 칸 (그래프용) */
export interface DailyScorePoint {
  /** YYYY-MM-DD (UTC 기준으로 저장된 값을 현지 날짜로 바꿔 만든다) */
  date: string;
  /** 그날의 평균 정답률 0~100 */
  accuracy: number;
  /** 그날 푼 문제 수 */
  totalCount: number;
}

/** 통계 화면이 한 번에 받는 값 */
export interface StatsView {
  summary: StatsSummary;
  dailyScores: DailyScorePoint[];
  recentQuizzes: QuizResult[];
  /** 오답 노트 — 틀린 횟수가 많은 순 */
  weakWords: WordView[];
  /** 별표를 켠 단어 */
  starredWords: WordView[];
  storage: StorageUsage;
}
