/**
 * 휴지통
 * 계획서 행위 8(되살리기) · 9(휴지통 비우기)를 부르는 자리.
 * 비우기는 되돌릴 수 없으므로 반드시 한 번 물어본다.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useStoredData } from "@/hooks/useStoredData";
import { emptyTrash, listTrashedWords, restoreWord } from "@/lib/services/word";
import type { WordView } from "@/lib/services/word.types";
import { listTrashedWordbooks, restoreWordbook } from "@/lib/services/wordbook";
import type { Wordbook } from "@/lib/storage/_types";
import { EmptyState } from "../../components/common/empty-state";
import { useServiceFeedback } from "../../components/common/use-service-feedback";

export default function TrashPage() {
  const t = useTranslations();
  const feedback = useServiceFeedback();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: trashedWordbooks } = useStoredData<Wordbook[]>(() => listTrashedWordbooks());
  const { data: trashedWords, isReady } = useStoredData<WordView[]>(() => listTrashedWords());

  const books = trashedWordbooks ?? [];
  const words = trashedWords ?? [];
  const isEmpty = books.length === 0 && words.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href="/ui/wordbooks" />}
          nativeButton={false}
          aria-label={t("common.back")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-display text-lg">{t("trash.title")}</h1>

        {!isEmpty && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
            {t("trash.emptyTrash")}
          </Button>
        )}
      </div>

      {!isReady ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </p>
      ) : isEmpty ? (
        <EmptyState Icon={Trash2} title={t("trash.empty")} />
      ) : (
        <>
          {books.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("trash.wordbookSection")}
              </h2>
              <ul className="rounded-lg border border-border/70 bg-card px-4">
                {books.map((book) => (
                  <li
                    key={book.id}
                    className="flex items-center gap-2 border-b border-border/60 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[15px]">{book.name}</p>
                      <p className="text-xs text-muted-foreground">{t(`lang.${book.lang}`)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        feedback(restoreWordbook(book.id), {
                          successMessage: t("trash.restored"),
                        })
                      }
                    >
                      <RotateCcw className="size-4" />
                      {t("trash.restore")}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {words.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("trash.wordSection")}
              </h2>
              <ul className="rounded-lg border border-border/70 bg-card px-4">
                {words.map((word) => (
                  <li
                    key={word.id}
                    className="flex items-center gap-2 border-b border-border/60 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[15px]">{word.term}</p>
                      <p className="truncate text-sm text-muted-foreground">{word.meaning}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                        {word.wordbookName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        feedback(restoreWord(word.id), { successMessage: t("trash.restored") })
                      }
                    >
                      <RotateCcw className="size-4" />
                      {t("trash.restore")}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {t("trash.emptyConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("trash.emptyConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const result = emptyTrash();
                feedback(result, {
                  successMessage: result.ok
                    ? t("trash.emptied", {
                        words: result.data.deletedWordCount,
                        wordbooks: result.data.deletedWordbookCount,
                      })
                    : undefined,
                });
                setConfirmOpen(false);
              }}
            >
              {t("trash.emptyTrash")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
