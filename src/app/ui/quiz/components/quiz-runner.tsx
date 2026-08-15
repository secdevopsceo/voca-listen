/**
 * 시험 푸는 화면
 * 보기는 뜻 4개 + 「모른다」로 모두 5개다(계획서 5지선다).
 * 듣고 풀기 모드에서는 단어를 보여주지 않고 소리만 들려준다.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle, Repeat, Volume2, X } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { useSettings } from "@/hooks/useSettings";
import { useTTS } from "@/hooks/useTTS";
import {
  NO_ANSWER,
  UNKNOWN_CHOICE_INDEX,
  type QuizSession,
} from "@/lib/services/quiz.types";
import { BCP47_BY_LANG } from "@/lib/tts/voices";
import { cn } from "@/lib/utils";
import { SoundWave } from "../../components/common/sound-wave";

export function QuizRunner({
  session,
  onSubmit,
  onQuit,
}: {
  session: QuizSession;
  onSubmit: (answers: number[]) => void;
  onQuit: () => void;
}) {
  const t = useTranslations();
  const { settings } = useSettings();
  const { speak, isSpeaking, isSupported } = useTTS({
    rate: settings.ttsRate,
    gender: settings.ttsGender,
  });

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    new Array(session.questions.length).fill(NO_ANSWER),
  );
  const [quitOpen, setQuitOpen] = useState(false);

  const question = session.questions[index];
  const isLast = index === session.questions.length - 1;
  /**
   * 소리만으로 푸는 모드 — 단어를 듣는 것(listen)과 예문을 듣는 것(example) 둘 다.
   * 화면에는 글자를 내지 않고 소리와 「다시 듣기」만 준다.
   */
  const isAudioOnly = session.mode === "listen" || session.mode === "example";
  /** 읽어줄 글 — 예문 듣고 풀기는 예문을, 그 밖에는 단어를 읽는다 */
  const spokenText = session.mode === "example" ? question.example : question.term;
  const bcp47 = BCP47_BY_LANG[question.lang];

  // 소리로 푸는 모드에서는 문제가 바뀔 때마다 한 번 읽어준다
  const spokenIndexRef = useRef(-1);
  useEffect(() => {
    if (!isAudioOnly || !isSupported) return;
    if (spokenIndexRef.current === index) return;
    spokenIndexRef.current = index;
    speak(spokenText, bcp47);
  }, [isAudioOnly, isSupported, index, spokenText, bcp47, speak]);

  const choose = (choiceIndex: number) => {
    const next = [...answers];
    next[index] = choiceIndex;
    setAnswers(next);

    // 마지막 문제가 아니면 잠깐 뒤 다음 문제로 넘어간다
    if (!isLast) {
      window.setTimeout(() => setIndex((prev) => prev + 1), 180);
      return;
    }
    onSubmit(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setQuitOpen(true)}
          aria-label={t("quiz.quit")}
        >
          <X className="size-4" />
        </Button>
        <Progress
          value={((index + 1) / session.questions.length) * 100}
          className="h-1.5 flex-1"
        />
        <span className="font-mono text-xs tabular text-muted-foreground">
          {t("quiz.question", { current: index + 1, total: session.questions.length })}
        </span>
      </div>

      {/* 문제 */}
      <section
        className={cn(
          "rise-in relative overflow-hidden rounded-xl border border-border/70 bg-card px-6 py-9 text-center",
          isSpeaking && "dial-glow",
        )}
        key={index}
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,currentColor_0_1px,transparent_1px_7px)] text-border/70"
        />

        {isAudioOnly ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="text-primary">
              <SoundWave active={isSpeaking} className="h-8" />
            </div>
            <Button
              variant="outline"
              onClick={() => speak(spokenText, bcp47)}
              disabled={!isSupported}
              className="gap-2"
            >
              <Repeat className="size-4" />
              {t("quiz.replay")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <p className="break-words font-display text-3xl leading-tight">
                {question.term}
              </p>
              {isSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => speak(question.term, bcp47)}
                  aria-label={t("word.listen")}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Volume2 className="size-[18px]" />
                </Button>
              )}
            </div>

            {question.reading !== "" && (
              <p className="mt-1.5 text-sm text-muted-foreground">{question.reading}</p>
            )}

            {question.example !== "" && (
              <div className="mt-5 flex items-center justify-center gap-1 border-t border-border/60 pt-4">
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  {question.example}
                </p>
                {isSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => speak(question.example, bcp47)}
                    aria-label={t("word.listen")}
                    className="shrink-0 text-muted-foreground hover:text-primary"
                  >
                    <Volume2 className="size-4" />
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* 보기 — 뜻 4개 + 「모른다」 */}
      <section className="grid gap-2">
        {question.choices.map((choice, choiceIndex) => (
          <button
            key={choiceIndex}
            type="button"
            onClick={() => choose(choiceIndex)}
            className={cn(
              "rounded-lg border border-border bg-card px-4 py-3.5 text-left text-[15px] transition-all",
              "hover:border-primary/60 hover:bg-primary/5 active:translate-y-px",
              answers[index] === choiceIndex && "border-primary bg-primary/10",
            )}
          >
            <span className="mr-3 font-mono text-xs tabular text-muted-foreground/60">
              {choiceIndex + 1}
            </span>
            {choice}
          </button>
        ))}

        <button
          type="button"
          onClick={() => choose(UNKNOWN_CHOICE_INDEX)}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3.5 text-left text-[15px] text-muted-foreground transition-all",
            "hover:border-foreground/40 hover:text-foreground active:translate-y-px",
            answers[index] === UNKNOWN_CHOICE_INDEX && "border-foreground/50 bg-muted",
          )}
        >
          <HelpCircle className="size-4" />
          {t("quiz.unknown")}
        </button>
      </section>

      <AlertDialog open={quitOpen} onOpenChange={setQuitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {t("quiz.quitConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("quiz.quitConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onQuit}>{t("quiz.quit")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
