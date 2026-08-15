/**
 * 듣기 학습 탭 (이 앱에서 가장 중요한 화면)
 *
 * 카드 하나씩 넘기며 듣거나, 재생 버튼 한 번으로 끝까지 자동으로 이어 듣는다.
 * 읽는 범위(단어만 / 단어+뜻 / 단어+뜻+예문)와 반복·간격은 설정을 따른다.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Headphones,
  Pause,
  Play,
  Shuffle,
  Star,
  VolumeX,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { ALL_WORDBOOKS, useSelectedWordbook } from "@/hooks/useSelectedWordbook";
import { useStoredData } from "@/hooks/useStoredData";
import { useStudyRange } from "@/hooks/useStudyRange";
import { useTTS } from "@/hooks/useTTS";
import { listWords } from "@/lib/services/word";
import type { WordView } from "@/lib/services/word.types";
import { listWordbooks } from "@/lib/services/wordbook";
import type { WordbookView } from "@/lib/services/wordbook.types";
import { orderForListening } from "@/lib/study-order";
import { filterByStudyRange } from "@/lib/study-range";
import { buildSpeakItems, type SpeakItem } from "@/lib/tts/items";
import { BCP47_BY_LANG } from "@/lib/tts/voices";
import { cn } from "@/lib/utils";
import { EmptyState } from "../components/common/empty-state";
import { SoundWave } from "../components/common/sound-wave";
import { StudyRangePicker } from "../components/common/study-range-picker";
import { SpeakButton } from "../components/common/speak-button";


export default function ListenPage() {
  const t = useTranslations();
  const { settings } = useSettings();

  // 세 화면이 같은 단어장을 본다(듣기에서 고르면 시험·목록에도 그대로 남는다)
  const { wordbookId, setWordbookId } = useSelectedWordbook();
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [showMeaning, setShowMeaning] = useState(true);
  const [index, setIndex] = useState(0);
  const [isAuto, setIsAuto] = useState(false);
  const [speakingPart, setSpeakingPart] = useState<SpeakItem["part"] | null>(null);
  /** 섞기를 누를 때마다 바뀌는 값 — 이 값이 바뀌면 순서를 다시 섞는다 */
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const { speak, speakQueue, stop, isSpeaking, isSupported } = useTTS({
    rate: settings.ttsRate,
    gender: settings.ttsGender,
  });

  const { range, setRange } = useStudyRange();
  const { data: wordbooks } = useStoredData<WordbookView[]>(() => listWordbooks());
  const { data: words, isReady } = useStoredData<WordView[]>(
    () =>
      listWords({
        wordbookId: wordbookId === ALL_WORDBOOKS ? undefined : wordbookId,
        onlyStarred,
      }),
    [wordbookId, onlyStarred],
  );

  const books = wordbooks ?? [];

  /**
   * 고른 단어장 이름.
   * Select 에 값만 주면 목록을 아직 못 읽은 첫 순간에 식별자가 그대로 보인다
   * (실제로 화면에 UUID 가 노출됐다) — 보여줄 글자를 직접 넘겨 막는다.
   */
  /** 전체를 골랐을 때 보여줄 합계 */
  const totalWordCount = books.reduce((sum, book) => sum + book.wordCount, 0);
  const selectedBook = books.find((book) => book.id === wordbookId) ?? null;

  // 아직 목록을 못 읽었으면 개수를 붙이지 않는다(0 개로 잘못 보이지 않게)
  const wordbookLabel =
    books.length === 0
      ? t("quiz.allWordbooks")
      : selectedBook === null
        ? `${t("quiz.allWordbooks")} (${totalWordCount})`
        : `${selectedBook.name} (${selectedBook.wordCount})`;

  /** 범위 밖이라 빠진 단어 수 — 실제로 있을 때만 안내를 띄운다(계획서 6-1) */
  const hiddenCount = useMemo(() => {
    const list = words ?? [];
    return list.length - filterByStudyRange(list, range).length;
  }, [words, range]);

  const cards = useMemo(() => {
    // 공부할 범위로 먼저 거르고, 듣기 순서대로 늘어놓는다(계획서 6-3)
    const list = orderForListening(filterByStudyRange(words ?? [], range));
    if (!shuffled) return list;
    // 섞기를 누른 뒤에는 순서를 뒤섞는다
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
    // shuffleSeed 는 다시 섞기 위한 신호다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, range, shuffled, shuffleSeed]);

  const current = cards[index] ?? null;

  // 조건이 바뀌면 첫 카드로 돌아간다
  useEffect(() => {
    setIndex(0);
  }, [wordbookId, onlyStarred, range, shuffleSeed]);

  /** 이 카드에서 읽을 항목들 */
  const speakItems = useMemo(() => {
    if (current === null) return [];
    return buildSpeakItems(current, settings.ttsReadScope, current.wordbookLang);
  }, [current, settings.ttsReadScope]);

  const stopAll = useCallback(() => {
    setIsAuto(false);
    setSpeakingPart(null);
    stop();
  }, [stop]);

  /** 자동으로 이어 듣는 중이면 이 카드를 읽고 끝나면 다음 카드로 넘긴다 */
  const autoRef = useRef(isAuto);
  autoRef.current = isAuto;

  useEffect(() => {
    if (!isAuto || current === null || speakItems.length === 0) return;

    speakQueue(speakItems, {
      repeat: settings.ttsRepeat,
      gapMs: settings.ttsGapMs,
      onItemStart: (item) => setSpeakingPart(item.part),
      onDone: () => {
        setSpeakingPart(null);
        if (!autoRef.current) return;
        setIndex((prev) => {
          // 마지막 카드까지 읽었으면 자동 재생을 멈춘다
          if (prev + 1 >= cards.length) {
            setIsAuto(false);
            return prev;
          }
          return prev + 1;
        });
      },
    });

    // 카드가 바뀌거나 자동 재생을 끄면 읽던 것을 멈춘다
    return () => {
      stop();
    };
    // speakQueue·stop 은 훅이 만든 함수라 의존성에서 뺀다(카드·설정이 바뀔 때만 다시 읽는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuto, index, speakItems, settings.ttsRepeat, settings.ttsGapMs]);

  /** 이 카드만 한 번 듣는다 */
  const playCurrentCard = () => {
    if (current === null || speakItems.length === 0) return;
    setIsAuto(false);
    speakQueue(speakItems, {
      repeat: settings.ttsRepeat,
      gapMs: settings.ttsGapMs,
      onItemStart: (item) => setSpeakingPart(item.part),
      onDone: () => setSpeakingPart(null),
    });
  };

  const go = (direction: -1 | 1) => {
    stopAll();
    setIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return cards.length - 1;
      if (next >= cards.length) return 0;
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <h1 className="font-display text-lg">{t("listen.title")}</h1>

      {!isSupported && isReady && (
        <Alert>
          <VolumeX className="size-4" />
          <AlertTitle>{t("listen.unsupportedTitle")}</AlertTitle>
          <AlertDescription>{t("listen.unsupportedBody")}</AlertDescription>
        </Alert>
      )}

      {/* 무엇을 들을지 고르기 */}
      <StudyRangePicker range={range} onChange={setRange} hiddenCount={hiddenCount} />

      <section className="flex flex-wrap items-center gap-2">
        <Select value={wordbookId} onValueChange={(value) => setWordbookId(value ?? ALL_WORDBOOKS)}>
          <SelectTrigger className="w-auto min-w-44 flex-1">
            <SelectValue>{wordbookLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_WORDBOOKS}>
              {t("quiz.allWordbooks")} ({totalWordCount})
            </SelectItem>
            {books.map((book) => (
              <SelectItem key={book.id} value={book.id}>
                {book.name} ({book.wordCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={onlyStarred ? "default" : "outline"}
          size="icon"
          aria-pressed={onlyStarred}
          aria-label={t("listen.starredOnly")}
          title={t("listen.starredOnly")}
          onClick={() => {
            stopAll();
            setOnlyStarred((prev) => !prev);
          }}
        >
          <Star className={cn("size-4", onlyStarred && "fill-current")} />
        </Button>

        <Button
          variant={shuffled ? "default" : "outline"}
          size="icon"
          aria-pressed={shuffled}
          aria-label={t("listen.shuffle")}
          title={t("listen.shuffle")}
          onClick={() => {
            stopAll();
            setShuffled((prev) => !prev);
            setShuffleSeed((prev) => prev + 1);
          }}
        >
          <Shuffle className="size-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          aria-label={showMeaning ? t("listen.hideMeaning") : t("listen.showMeaning")}
          title={showMeaning ? t("listen.hideMeaning") : t("listen.showMeaning")}
          onClick={() => setShowMeaning((prev) => !prev)}
        >
          {showMeaning ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </Button>
      </section>

      {!isReady ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : current === null ? (
        <EmptyState Icon={Headphones} title={t("listen.empty")} />
      ) : (
        <>
          {/* 단어 카드 — 라디오 다이얼처럼 재생 중에는 빛이 번진다 */}
          <section
            className={cn(
              "rise-in relative overflow-hidden rounded-xl border border-border/70 bg-card px-6 py-10 text-center transition-shadow duration-500",
              isSpeaking && "dial-glow",
            )}
          >
            {/* 위쪽 눈금 — 라디오 주파수 띠 */}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,currentColor_0_1px,transparent_1px_7px)] text-border/70"
            />

            <p className="font-mono text-[11px] tabular text-muted-foreground/70">
              {t("listen.progress", { current: index + 1, total: cards.length })}
              {" · "}
              {current.wordbookName}
            </p>

            <p
              className={cn(
                "mt-4 break-words font-display text-4xl leading-tight",
                speakingPart === "term" && "speaking-line text-primary",
              )}
            >
              {current.term}
            </p>

            {current.reading !== "" && (
              <p className="mt-2 text-sm text-muted-foreground">{current.reading}</p>
            )}

            {/*
              * 🚨 「뜻 가리기」 중이어도 **지금 읽고 있는 뜻은 보여 준다**.
              * 소리로 답을 알려주면서 글자는 가려 두면, 맞혔는지 눈으로 확인할 수가 없다.
              */}
            <p
              className={cn(
                "mt-4 text-lg transition-all",
                showMeaning || speakingPart === "meaning"
                  ? "opacity-100"
                  : "select-none opacity-0",
                speakingPart === "meaning" && "speaking-line text-primary",
              )}
            >
              {current.meaning}
            </p>

            {current.example !== "" && (
              <div className="mt-6 space-y-1 border-t border-border/60 pt-4">
                <p
                  className={cn(
                    "text-[15px] leading-relaxed",
                    speakingPart === "example" && "speaking-line text-primary",
                  )}
                >
                  {current.example}
                </p>
                {/*
                  * 🚨 숨김일 때 아예 그리지 않으면 읽는 순간에 보여줄 요소가 없다(실제 버그였다).
                  * 위 뜻과 똑같이 투명도로만 가리고, 읽는 중에는 보여 준다.
                  * 자리도 그대로 남아 카드 높이가 들썩이지 않는다.
                  */}
                {current.exampleMeaning !== "" && (
                  <p
                    className={cn(
                      "text-sm transition-all",
                      showMeaning || speakingPart === "exampleMeaning"
                        ? "opacity-100"
                        : "select-none opacity-0",
                      speakingPart === "exampleMeaning"
                        ? "speaking-line text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {current.exampleMeaning}
                  </p>
                )}
              </div>
            )}

            {isSpeaking && (
              <div className="mt-6 flex items-center justify-center gap-2 text-primary">
                <SoundWave active />
                <span className="text-xs">{t("listen.nowPlaying")}</span>
              </div>
            )}
          </section>

          {/* 조작 */}
          <section className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => go(-1)}
              aria-label={t("common.previous")}
            >
              <ChevronLeft className="size-4" />
            </Button>

            <SpeakButton
              text={current.term}
              bcp47={BCP47_BY_LANG[current.wordbookLang]}
              label={t("word.listen")}
            />

            <Button
              size="lg"
              className="min-w-36 gap-2"
              disabled={!isSupported}
              onClick={() => {
                if (isAuto || isSpeaking) {
                  stopAll();
                  return;
                }
                setIsAuto(true);
              }}
            >
              {isAuto || isSpeaking ? (
                <>
                  <Pause className="size-4" />
                  {t("listen.stop")}
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  {t("listen.autoPlay")}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              disabled={!isSupported}
              onClick={playCurrentCard}
              aria-label={t("listen.playCard")}
              title={t("listen.playCard")}
            >
              <Headphones className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => go(1)}
              aria-label={t("common.next")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </section>

          <p className="text-center text-xs text-muted-foreground/70">
            {t("listen.scopeHint")}
          </p>
        </>
      )}
    </div>
  );
}
