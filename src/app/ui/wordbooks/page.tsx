/**
 * 단어장 탭
 * 단어장을 고르고, 그 안의 단어를 넣고 고치고 지운다(계획서 행위 2~10).
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BookMarked,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useStoredData } from "@/hooks/useStoredData";
import { useStudyRange } from "@/hooks/useStudyRange";
import { listWords } from "@/lib/services/word";
import type { WordView } from "@/lib/services/word.types";
import { listWordbooks, trashWordbook } from "@/lib/services/wordbook";
import type { WordbookView } from "@/lib/services/wordbook.types";
import type { Word } from "@/lib/storage/_types";
import { filterByStudyRange } from "@/lib/study-range";
import { cn } from "@/lib/utils";
import { setCurrentWordbook, setKeyword, setOnlyStarred } from "@/store/slice/uiSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { EmptyState } from "../components/common/empty-state";
import { useServiceFeedback } from "../components/common/use-service-feedback";
import { StudyRangePicker } from "../components/common/study-range-picker";
import { OfflineReady } from "./components/offline-ready";
import { WordFormDialog } from "./components/word-form-dialog";
import { WordRow } from "./components/word-row";
import { WordbookFormDialog } from "./components/wordbook-form-dialog";

/**
 * 한 번에 그리는 단어 수.
 * 글로비시 기본 단어장만 해도 1500개라, 전부 그리면 화면이 버벅이고 스크롤이 무거워진다.
 * 필요한 만큼만 그리고 「더 보기」로 늘린다.
 */
const PAGE_SIZE = 60;

export default function WordbooksPage() {
  const t = useTranslations();
  const dispatch = useAppDispatch();
  const feedback = useServiceFeedback();

  const { currentWordbookId, keyword, onlyStarred } = useAppSelector((state) => state.ui);

  const [wordbookDialogOpen, setWordbookDialogOpen] = useState(false);
  const [editingWordbook, setEditingWordbook] = useState<WordbookView | null>(null);
  const [wordDialogOpen, setWordDialogOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [trashTarget, setTrashTarget] = useState<WordbookView | null>(null);

  const { data: wordbooks } = useStoredData<WordbookView[]>(() => listWordbooks());
  const { data: words, isReady } = useStoredData<WordView[]>(
    () =>
      listWords({
        wordbookId: currentWordbookId ?? undefined,
        keyword,
        onlyStarred,
      }),
    [currentWordbookId, keyword, onlyStarred],
  );

  const { range, setRange } = useStudyRange();
  const books = wordbooks ?? [];
  const allRows = words ?? [];
  // 공부할 범위 밖 단어는 목록에서도 뺀다(계획서 6-1)
  const rows = filterByStudyRange(allRows, range);
  const hiddenCount = allRows.length - rows.length;
  const selected = books.find((book) => book.id === currentWordbookId) ?? null;
  const hasFilter = keyword !== "" || onlyStarred;

  // 찾는 조건이 바뀌면 처음부터 다시 보여준다
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [currentWordbookId, keyword, onlyStarred, range]);

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = rows.length > visibleCount;

  const openNewWordbook = () => {
    setEditingWordbook(null);
    setWordbookDialogOpen(true);
  };

  const openNewWord = () => {
    setEditingWord(null);
    setWordDialogOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* 인터넷 없이 쓸 준비 — 준비가 끝나면 조용한 한 줄로 줄어든다 */}
      <OfflineReady />

      <StudyRangePicker range={range} onChange={setRange} hiddenCount={hiddenCount} />

      {/* 단어장 고르기 — 가로로 넘겨 본다 */}
      <section className="-mx-4 px-4">
        <div className="flex items-center justify-between pb-2">
          <h1 className="font-display text-lg">{t("wordbook.title")}</h1>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/ui/wordbooks/trash" />}
            nativeButton={false}
            className="text-muted-foreground"
          >
            <Trash2 className="size-4" />
            {t("trash.open")}
          </Button>
        </div>

      {/*
       * 🚨 「단어장 만들기」는 넘겨 보는 줄 **밖**에 두어 오른쪽에 붙박아 둔다.
       * 줄 안에 두면 글로비시 품사 단어장 10개에 밀려 화면 밖으로 나가,
       * 단어장을 만드는 기능이 아예 없는 것처럼 보인다(실제로 그렇게 보인다는 지적을 받았다).
       */}
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => dispatch(setCurrentWordbook(null))}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              currentWordbookId === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {t("common.all")}
          </button>

          {books.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => dispatch(setCurrentWordbook(book.id))}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                currentWordbookId === book.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {book.name}
              <span
                className={cn(
                  "font-mono text-[11px] tabular",
                  currentWordbookId === book.id
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground/60",
                )}
              >
                {book.wordCount}
              </span>
            </button>
          ))}

        </div>

        {/*
         * 🚨 배경을 채운다. 점선 테두리에 회색 글씨로 두었더니 바탕에 묻혀
         *    "단어장을 만드는 기능이 없는 것 같다"는 말을 들었다.
         *    바로 아래 「단어 추가」와 같은 모양이라 둘 다 "새로 만드는 동작"으로 읽힌다.
         */}
        <button
          type="button"
          onClick={openNewWordbook}
          className="flex shrink-0 items-center gap-1 self-start rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus className="size-3.5" />
          {t("wordbook.create")}
        </button>
      </div>
      </section>

      {/* 고른 단어장 정보 */}
      {selected !== null && (
        <section className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-display text-base">{selected.name}</h2>
              {selected.isDefault && (
                <Badge variant="secondary" className="text-[10px]">
                  {t("wordbook.defaultBadge")}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t(`lang.${selected.lang}`)} · {t("wordbook.wordCount", { count: selected.wordCount })}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label={t("common.edit")} />}
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingWordbook(selected);
                  setWordbookDialogOpen(true);
                }}
              >
                <Pencil className="size-4" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={selected.isDefault}
                onClick={() => setTrashTarget(selected)}
              >
                <Trash2 className="size-4" />
                {t("wordbook.moveToTrash")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>
      )}

      {/* 찾기 · 골라 보기 */}
      <section className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={keyword}
            onChange={(event) => dispatch(setKeyword(event.target.value))}
            placeholder={t("word.searchPlaceholder")}
            className="pl-9 pr-9"
          />
          {keyword !== "" && (
            <button
              type="button"
              onClick={() => dispatch(setKeyword(""))}
              aria-label={t("common.reset")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Button
          variant={onlyStarred ? "default" : "outline"}
          size="icon"
          aria-label={t("word.starred")}
          aria-pressed={onlyStarred}
          onClick={() => dispatch(setOnlyStarred(!onlyStarred))}
        >
          <Star className={cn("size-4", onlyStarred && "fill-current")} />
        </Button>

        <Button onClick={openNewWord} disabled={books.length === 0}>
          <Plus className="size-4" />
          {t("word.add")}
        </Button>
      </section>

      {/* 단어 목록 */}
      <section>
        {!isReady ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("common.loading")}
          </p>
        ) : books.length === 0 ? (
          <EmptyState
            Icon={BookMarked}
            title={t("wordbook.empty")}
            action={
              <Button onClick={openNewWordbook} size="sm" className="mt-1">
                <Plus className="size-4" />
                {t("wordbook.create")}
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            Icon={BookMarked}
            title={hasFilter ? t("word.emptyFiltered") : t("word.empty")}
            action={
              hasFilter ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    dispatch(setKeyword(""));
                    dispatch(setOnlyStarred(false));
                  }}
                >
                  {t("common.reset")}
                </Button>
              ) : (
                <Button onClick={openNewWord} size="sm" className="mt-1">
                  <Plus className="size-4" />
                  {t("word.add")}
                </Button>
              )
            }
          />
        ) : (
          <>
            <p className="pb-1 font-mono text-[11px] tabular text-muted-foreground/70">
              {t("wordbook.wordCount", { count: rows.length })}
            </p>
            <ul className="rounded-lg border border-border/70 bg-card px-4">
              {visibleRows.map((word) => (
                <WordRow
                  key={word.id}
                  word={word}
                  onEdit={(target) => {
                    setEditingWord(target);
                    setWordDialogOpen(true);
                  }}
                />
              ))}
            </ul>

            {hasMore && (
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                {t("common.showMore", { count: rows.length - visibleCount })}
              </Button>
            )}
          </>
        )}
      </section>

      <WordbookFormDialog
        open={wordbookDialogOpen}
        onOpenChange={setWordbookDialogOpen}
        target={editingWordbook}
      />

      <WordFormDialog
        open={wordDialogOpen}
        onOpenChange={setWordDialogOpen}
        wordbooks={books}
        target={editingWord}
        defaultWordbookId={currentWordbookId}
      />

      {/* 단어장을 휴지통에 넣기 — 계획서 행위 4 */}
      <AlertDialog
        open={trashTarget !== null}
        onOpenChange={(next) => {
          if (!next) setTrashTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {t("wordbook.trashConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("wordbook.trashConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (trashTarget === null) return;
                const result = trashWordbook(trashTarget.id);
                feedback(result, {
                  onSuccess: (data) => {
                    if (currentWordbookId === trashTarget.id) {
                      dispatch(setCurrentWordbook(null));
                    }
                    return data;
                  },
                  successMessage:
                    result.ok
                      ? t("wordbook.trashed", { count: result.data.trashedWordCount })
                      : undefined,
                });
                setTrashTarget(null);
              }}
            >
              {t("wordbook.moveToTrash")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
