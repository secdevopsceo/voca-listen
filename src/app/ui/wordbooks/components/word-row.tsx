/**
 * 단어 한 줄
 * 단어·뜻과 함께 스피커 버튼(계획서: 단어·예문 옆에서 언제든 들을 수 있게)을 둔다.
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleStar, trashWord } from "@/lib/services/word";
import type { WordView } from "@/lib/services/word.types";
import { BCP47_BY_LANG, KOREAN_BCP47 } from "@/lib/tts/voices";
import { cn } from "@/lib/utils";
import { SpeakButton } from "../../components/common/speak-button";
import { useServiceFeedback } from "../../components/common/use-service-feedback";

export function WordRow({
  word,
  onEdit,
}: {
  word: WordView;
  onEdit: (word: WordView) => void;
}) {
  const t = useTranslations();
  const feedback = useServiceFeedback();
  const [expanded, setExpanded] = useState(false);

  const bcp47 = BCP47_BY_LANG[word.wordbookLang];
  const hasDetail =
    word.example !== "" || word.exampleMeaning !== "" || word.memo !== "" || word.reading !== "";

  return (
    <li className="group border-b border-border/60 last:border-b-0">
      <div className="flex items-start gap-2 py-3">
        <button
          type="button"
          onClick={() => hasDetail && setExpanded((prev) => !prev)}
          className={cn("min-w-0 flex-1 text-left", hasDetail && "cursor-pointer")}
        >
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-[17px] leading-snug">
              {word.term}
            </span>
            {word.starred && (
              <Star className="size-3.5 shrink-0 fill-primary text-primary" />
            )}
            {hasDetail && (
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground/60 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{word.meaning}</p>

          <p className="mt-1 font-mono text-[11px] tabular text-muted-foreground/70">
            {word.lastTestedAt === null
              ? t("word.neverTested")
              : `${t("word.stats", { correct: word.correctCount, wrong: word.wrongCount })} · ${t("word.accuracy", { value: word.accuracy })}`}
          </p>
        </button>

        <SpeakButton text={word.term} bcp47={bcp47} size="sm" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground"
                aria-label={t("common.edit")}
              />
            }
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(word)}>
              <Pencil className="size-4" />
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => feedback(toggleStar(word.id))}>
              <Star className={cn("size-4", word.starred && "fill-primary text-primary")} />
              {word.starred ? t("word.starOff") : t("word.starOn")}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                feedback(trashWord(word.id), { successMessage: t("word.trashed") })
              }
            >
              <Trash2 className="size-4" />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && hasDetail && (
        <div className="rise-in space-y-2 pb-3 pl-1 text-sm">
          {word.reading !== "" && (
            <p className="text-muted-foreground">
              <span className="mr-2 text-xs uppercase tracking-wider text-muted-foreground/60">
                {t("word.reading")}
              </span>
              {word.reading}
            </p>
          )}

          {word.example !== "" && (
            <div className="flex items-start gap-1 rounded-md bg-muted/60 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="leading-relaxed">{word.example}</p>
                {word.exampleMeaning !== "" && (
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {word.exampleMeaning}
                  </p>
                )}
              </div>
              <SpeakButton text={word.example} bcp47={bcp47} size="sm" />
            </div>
          )}

          {word.memo !== "" && (
            <p className="border-l-2 border-primary/40 pl-3 text-[13px] italic text-muted-foreground">
              {word.memo}
            </p>
          )}

          {word.meaning !== "" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
              {t("word.meaning")}
              <SpeakButton text={word.meaning} bcp47={KOREAN_BCP47} size="sm" />
            </div>
          )}
        </div>
      )}
    </li>
  );
}
