/**
 * 통계 탭
 * 얼마나 외웠는지 보여주고, 「점수만 지우기」(계획서 행위 12)를 부르는 자리.
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, BarChart3, Star, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useStoredData } from "@/hooks/useStoredData";
import { resetScores } from "@/lib/services/reset";
import { getStats } from "@/lib/services/stats";
import type { StatsView } from "@/lib/services/stats.types";
import { BCP47_BY_LANG } from "@/lib/tts/voices";
import { EmptyState } from "../components/common/empty-state";
import { SpeakButton } from "../components/common/speak-button";
import { useServiceFeedback } from "../components/common/use-service-feedback";
import { DailyChart } from "./components/daily-chart";

/** 바이트를 사람이 읽는 단위로 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl tabular">{value}</p>
    </div>
  );
}

export default function StatsPage() {
  const t = useTranslations();
  const feedback = useServiceFeedback();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: stats, isReady } = useStoredData<StatsView>(() => getStats());

  if (!isReady || stats === null) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
    );
  }

  const { summary, dailyScores, recentQuizzes, weakWords, starredWords, storage } = stats;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-lg">{t("stats.title")}</h1>

      {/* 요약 */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t("stats.totalWords")} value={summary.totalWordCount} />
        <StatTile label={t("stats.testedWords")} value={summary.testedWordCount} />
        <StatTile label={t("stats.masteredWords")} value={summary.masteredWordCount} />
        <StatTile label={t("stats.dueWords")} value={summary.dueWordCount} />
      </section>

      {/* 전체 정답률 */}
      <section className="rounded-lg border border-border/70 bg-card px-4 py-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">{t("stats.overallAccuracy")}</p>
          <p className="font-mono text-2xl tabular text-primary">
            {summary.overallAccuracy}%
          </p>
        </div>
        <Progress value={summary.overallAccuracy} className="mt-3 h-1.5" />
        <p className="mt-2 font-mono text-[11px] tabular text-muted-foreground/70">
          {t("word.stats", {
            correct: summary.totalCorrectCount,
            wrong: summary.totalWrongCount,
          })}
          {" · "}
          {t("stats.quizCount")} {summary.quizCount}
        </p>
      </section>

      {/* 날짜별 그래프 */}
      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("stats.dailyChart")}
        </h2>
        {dailyScores.length === 0 ? (
          <EmptyState Icon={BarChart3} title={t("stats.dailyChartEmpty")} />
        ) : (
          <div className="rounded-lg border border-border/70 bg-card py-3 pr-3">
            <DailyChart points={dailyScores} />
          </div>
        )}
      </section>

      {/* 최근 시험 */}
      {recentQuizzes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("stats.recentQuizzes")}
          </h2>
          <ul className="rounded-lg border border-border/70 bg-card px-4">
            {recentQuizzes.map((quiz) => (
              <li
                key={quiz.id}
                className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-b-0"
              >
                <span className="font-mono text-xs tabular text-muted-foreground">
                  {quiz.finishedAt.slice(0, 10)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {
                    {
                      see: t("quiz.modeSee"),
                      listen: t("quiz.modeListen"),
                      example: t("quiz.modeExample"),
                    }[quiz.mode]
                  }
                </span>
                <span className="font-mono tabular">
                  {quiz.correctCount}/{quiz.totalCount}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 오답 노트 */}
      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("stats.weakWords")}
        </h2>
        {weakWords.length === 0 ? (
          <EmptyState Icon={TriangleAlert} title={t("stats.weakWordsEmpty")} />
        ) : (
          <ul className="rounded-lg border border-border/70 bg-card px-4">
            {weakWords.map((word) => (
              <li
                key={word.id}
                className="flex items-center gap-2 border-b border-border/60 py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[15px]">{word.term}</p>
                  <p className="truncate text-sm text-muted-foreground">{word.meaning}</p>
                </div>
                <span className="shrink-0 font-mono text-xs tabular text-destructive">
                  {word.wrongCount}
                </span>
                <SpeakButton
                  text={word.term}
                  bcp47={BCP47_BY_LANG[word.wordbookLang]}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 별표 */}
      {starredWords.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Star className="size-3 fill-primary text-primary" />
            {t("stats.starredWords")}
          </h2>
          <ul className="rounded-lg border border-border/70 bg-card px-4">
            {starredWords.map((word) => (
              <li
                key={word.id}
                className="flex items-center gap-2 border-b border-border/60 py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[15px]">{word.term}</p>
                  <p className="truncate text-sm text-muted-foreground">{word.meaning}</p>
                </div>
                <SpeakButton
                  text={word.term}
                  bcp47={BCP47_BY_LANG[word.wordbookLang]}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 저장공간 */}
      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("stats.storage")}
        </h2>
        <div className="rounded-lg border border-border/70 bg-card px-4 py-3">
          <p className="font-mono text-xs tabular text-muted-foreground">
            {t("stats.storageUsed", {
              used: formatBytes(storage.usedBytes),
              total: formatBytes(storage.quotaBytes),
            })}
          </p>
          <Progress value={Math.min(storage.ratio * 100, 100)} className="mt-2 h-1.5" />
        </div>
        {storage.isNearFull && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>{t("stats.storageWarning")}</AlertDescription>
          </Alert>
        )}
      </section>

      {/* 점수만 지우기 — 계획서 행위 12 */}
      <section className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4">
        <h2 className="font-display text-[15px]">{t("stats.resetTitle")}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("stats.resetDescription")}
        </p>
        <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          {t("stats.resetButton")}
        </Button>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {t("stats.resetConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("stats.resetConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const result = resetScores();
                feedback(result, {
                  successMessage: result.ok
                    ? t("stats.resetDone", {
                        words: result.data.keptWordCount,
                        wordbooks: result.data.keptWordbookCount,
                      })
                    : undefined,
                });
                setConfirmOpen(false);
              }}
            >
              {t("stats.resetButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
