/**
 * 시험 준비 화면 — 문제 수·푸는 방법·단어장을 고른다.
 */

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Headphones, MessagesSquare, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_WORDBOOKS, useSelectedWordbook } from "@/hooks/useSelectedWordbook";
import { useStoredData } from "@/hooks/useStoredData";
import { useStudyRange } from "@/hooks/useStudyRange";
import { QUIZ_COUNT_OPTIONS, type GenerateQuizInput } from "@/lib/services/quiz.types";
import { listWords } from "@/lib/services/word";
import type { WordView } from "@/lib/services/word.types";
import { filterByStudyRange } from "@/lib/study-range";
import { StudyRangePicker } from "../../components/common/study-range-picker";
import type { WordbookView } from "@/lib/services/wordbook.types";
import type { QuizMode } from "@/lib/storage/_types";
import { cn } from "@/lib/utils";


export function QuizSetup({
  wordbooks,
  totalWordCount,
  onStart,
}: {
  wordbooks: WordbookView[];
  totalWordCount: number;
  onStart: (input: GenerateQuizInput) => void;
}) {
  const t = useTranslations();
  // 듣기·단어장 목록에서 고른 단어장을 그대로 이어받는다
  const { wordbookId, setWordbookId } = useSelectedWordbook();
  const [count, setCount] = useState<number>(20);
  const [mode, setMode] = useState<QuizMode>("see");

  const { range, setRange } = useStudyRange();
  const selected = wordbooks.find((book) => book.id === wordbookId) ?? null;

  // 범위를 좁히면 문제로 낼 수 있는 단어 수도 줄어든다 — 실제 단어를 세어 보여 준다
  const { data: words } = useStoredData<WordView[]>(
    () => listWords({ wordbookId: wordbookId === ALL_WORDBOOKS ? undefined : wordbookId }),
    [wordbookId],
  );
  const inRangeCount = useMemo(
    () => filterByStudyRange(words ?? [], range).length,
    [words, range],
  );
  const hiddenCount = (words ?? []).length - inRangeCount;
  /**
   * 예문 듣고 풀기는 예문과 예문 뜻이 모두 있는 단어만 낼 수 있다.
   * 여기서 함께 세지 않으면 「20개」라고 보여 주고 시작하면 못 만든다는 말이 나온다.
   */
  const usableCount = useMemo(() => {
    const inRange = filterByStudyRange(words ?? [], range);
    if (mode !== "example") return inRange.length;
    return inRange.filter(
      (word) => word.example.trim() !== "" && word.exampleMeaning.trim() !== "",
    ).length;
  }, [words, range, mode]);
  const noExampleCount = inRangeCount - usableCount;
  const selectedCount =
    words === null
      ? wordbookId === ALL_WORDBOOKS
        ? totalWordCount
        : (selected?.wordCount ?? 0)
      : usableCount;
  // 목록을 아직 못 읽은 순간에 식별자가 그대로 보이지 않게 이름을 직접 넘긴다.
  // 아직 못 읽었으면 개수를 붙이지 않는다(0 개로 잘못 보이지 않게)
  const wordbookLabel =
    wordbooks.length === 0
      ? t("quiz.allWordbooks")
      : selected === null
        ? `${t("quiz.allWordbooks")} (${totalWordCount})`
        : `${selected.name} (${selected.wordCount})`;

  return (
    <div className="rise-in space-y-6">
      <h1 className="font-display text-lg">{t("quiz.setupTitle")}</h1>

      <StudyRangePicker range={range} onChange={setRange} hiddenCount={hiddenCount} />

      <div className="space-y-2">
        <Label htmlFor="quiz-wordbook">{t("quiz.wordbookLabel")}</Label>
        <Select
          value={wordbookId}
          onValueChange={(value) => setWordbookId(value ?? ALL_WORDBOOKS)}
        >
          <SelectTrigger id="quiz-wordbook" className="w-full">
            <SelectValue>{wordbookLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_WORDBOOKS}>
              {t("quiz.allWordbooks")} ({totalWordCount})
            </SelectItem>
            {wordbooks.map((book) => (
              <SelectItem key={book.id} value={book.id}>
                {book.name} ({book.wordCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="font-mono text-[11px] tabular text-muted-foreground/70">
          {t("wordbook.wordCount", { count: selectedCount })}
        </p>
        {noExampleCount > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {t("quiz.noExampleNotice", { count: noExampleCount })}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("quiz.countLabel")}</Label>
        <div className="grid grid-cols-4 gap-2">
          {QUIZ_COUNT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCount(option)}
              className={cn(
                "rounded-lg border py-2.5 font-mono text-sm tabular transition-colors",
                count === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("quiz.modeLabel")}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { value: "see", Icon: Eye, title: t("quiz.modeSee"), hint: t("quiz.modeSeeHint") },
              {
                value: "listen",
                Icon: Headphones,
                title: t("quiz.modeListen"),
                hint: t("quiz.modeListenHint"),
              },
              {
                value: "example",
                Icon: MessagesSquare,
                title: t("quiz.modeExample"),
                hint: t("quiz.modeExampleHint"),
              },
            ] as const
          ).map(({ value, Icon, title, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left transition-colors",
                mode === value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-foreground/30",
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-2 font-display text-[15px]",
                  mode === value && "text-primary",
                )}
              >
                <Icon className="size-4" />
                {title}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        className="w-full gap-2"
        disabled={selectedCount === 0}
        onClick={() =>
          onStart({
            wordbookId: wordbookId === ALL_WORDBOOKS ? undefined : wordbookId,
            count,
            mode,
            studyRange: range,
          })
        }
      >
        <Play className="size-4" />
        {t("quiz.start")}
      </Button>
    </div>
  );
}
