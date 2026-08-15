/**
 * 시험 탭
 * 준비 → 풀이 → 결과 세 단계를 한 화면에서 오간다.
 * 채점(계획서 행위 11)은 service 가 맡고, 이 화면은 결과만 보여준다.
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListChecks } from "lucide-react";
import { useStoredData } from "@/hooks/useStoredData";
import { generateQuiz, submitQuiz } from "@/lib/services/quiz";
import type {
  GenerateQuizInput,
  QuizSession,
  QuizSubmitResult,
} from "@/lib/services/quiz.types";
import { listWordbooks } from "@/lib/services/wordbook";
import type { WordbookView } from "@/lib/services/wordbook.types";
import { EmptyState } from "../components/common/empty-state";
import { useServiceFeedback } from "../components/common/use-service-feedback";
import { QuizResult } from "./components/quiz-result";
import { QuizRunner } from "./components/quiz-runner";
import { QuizSetup } from "./components/quiz-setup";

export default function QuizPage() {
  const t = useTranslations();
  const feedback = useServiceFeedback();

  const [session, setSession] = useState<QuizSession | null>(null);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [lastInput, setLastInput] = useState<GenerateQuizInput | null>(null);

  const { data: wordbooks, isReady } = useStoredData<WordbookView[]>(() => listWordbooks());
  const books = wordbooks ?? [];
  const totalWordCount = books.reduce((sum, book) => sum + book.wordCount, 0);

  const start = (input: GenerateQuizInput) => {
    const generated = generateQuiz(input);
    feedback(generated, {
      onSuccess: (data) => {
        setSession(data);
        setResult(null);
        setLastInput(input);
      },
      // 시험을 만드는 것만으로는 데이터가 바뀌지 않는다
      refresh: false,
    });
  };

  const submit = (answers: number[]) => {
    if (session === null) return;
    const submitted = submitQuiz(session, answers);
    feedback(submitted, { onSuccess: (data) => setResult(data) });
  };

  const reset = () => {
    setSession(null);
    setResult(null);
  };

  if (!isReady) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
    );
  }

  if (totalWordCount === 0) {
    return <EmptyState Icon={ListChecks} title={t("quiz.notEnough")} />;
  }

  if (result !== null && session !== null) {
    return (
      <QuizResult
        result={result}
        session={session}
        onRetry={() => {
          if (lastInput !== null) {
            start(lastInput);
            return;
          }
          reset();
        }}
      />
    );
  }

  if (session !== null) {
    return <QuizRunner session={session} onSubmit={submit} onQuit={reset} />;
  }

  return (
    <QuizSetup wordbooks={books} totalWordCount={totalWordCount} onStart={start} />
  );
}
