/**
 * 채점 결과 화면
 * 틀린 문제는 정답과 함께 보여주고, 그 자리에서 소리로 다시 들을 수 있게 한다.
 */

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { BarChart3, Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuizSession, QuizSubmitResult } from "@/lib/services/quiz.types";
import { UNKNOWN_CHOICE_INDEX } from "@/lib/services/quiz.types";
import { BCP47_BY_LANG } from "@/lib/tts/voices";
import { cn } from "@/lib/utils";
import { SpeakButton } from "../../components/common/speak-button";

function pickMessageKey(percentage: number) {
  if (percentage === 100) return "quiz.messagePerfect";
  if (percentage >= 80) return "quiz.messageGreat";
  if (percentage >= 60) return "quiz.messageGood";
  if (percentage >= 40) return "quiz.messageSoso";
  return "quiz.messageBad";
}

export function QuizResult({
  result,
  session,
  onRetry,
}: {
  result: QuizSubmitResult;
  session: QuizSession;
  onRetry: () => void;
}) {
  const t = useTranslations();
  const wrongDetails = result.details.filter(
    (detail) => !detail.isCorrect && detail.selectedIndex !== -1,
  );

  return (
    <div className="rise-in space-y-6">
      {/* 점수 */}
      <section className="relative overflow-hidden rounded-xl border border-border/70 bg-card px-6 py-10 text-center">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,currentColor_0_1px,transparent_1px_7px)] text-border/70"
        />
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("quiz.resultTitle")}
        </p>
        <p className="mt-3 font-mono text-5xl tabular text-primary">
          {t("quiz.percentage", { value: result.percentage })}
        </p>
        <p className="mt-2 font-mono text-sm tabular text-muted-foreground">
          {t("quiz.score", { correct: result.correctCount, total: result.totalCount })}
          {result.unknownCount > 0 && (
            <> · {t("quiz.unknownCount", { count: result.unknownCount })}</>
          )}
        </p>
        <p className="mt-4 font-display text-base">{t(pickMessageKey(result.percentage))}</p>
      </section>

      {/* 틀린 문제 */}
      {wrongDetails.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("quiz.reviewTitle")}
          </h2>
          <ul className="rounded-lg border border-border/70 bg-card px-4">
            {wrongDetails.map((detail) => {
              const question = session.questions[detail.questionIndex];
              // 예문 듣고 풀기는 들은 것이 예문이므로, 다시 볼 때도 그 문장을 보여 준다.
              // 단어만 보여 주면 「무엇을 들었는지」와 「정답(예문 뜻)」이 어긋나 보인다.
              const isExampleMode = session.mode === "example";
              const heard = isExampleMode ? question.example : detail.term;
              const chosen =
                detail.selectedIndex === UNKNOWN_CHOICE_INDEX
                  ? t("quiz.unknown")
                  : (question.choices[detail.selectedIndex] ?? "-");

              return (
                <li
                  key={detail.questionIndex}
                  className="border-b border-border/60 py-3 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[15px]">{heard}</span>
                    <SpeakButton
                      text={heard}
                      bcp47={BCP47_BY_LANG[question.lang]}
                      size="sm"
                    />
                  </div>
                  {isExampleMode && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{detail.term}</p>
                  )}
                  <p className="mt-1 flex items-center gap-1.5 text-sm">
                    <Check className="size-3.5 text-primary" />
                    <span className="text-muted-foreground">{t("quiz.correctAnswer")}</span>
                    {detail.meaning}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <X className="size-3.5 text-destructive" />
                    <span>{t("quiz.yourAnswer")}</span>
                    <span className={cn(detail.isUnknown && "italic")}>{chosen}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={onRetry}>
          <RotateCcw className="size-4" />
          {t("quiz.retry")}
        </Button>
        <Button
          className="flex-1 gap-2"
          render={<Link href="/ui/stats" />}
          nativeButton={false}
        >
          <BarChart3 className="size-4" />
          {t("quiz.backToStats")}
        </Button>
      </section>
    </div>
  );
}
