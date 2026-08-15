/**
 * 단어 추가 · 고치기 창
 * 계획서 행위 5(추가 — 중복 분기 포함) · 6(수정)을 화면에서 부르는 자리.
 */

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GRADE_LEVELS, type GradeKind } from "@/lib/study-range";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addWord, editWord } from "@/lib/services/word";
import type { Word } from "@/lib/storage/_types";
import type { WordbookView } from "@/lib/services/wordbook.types";
import { useServiceFeedback } from "../../components/common/use-service-feedback";


interface FormState {
  wordbookId: string;
  term: string;
  meaning: string;
  reading: string;
  example: string;
  exampleMeaning: string;
  partOfSpeech: string;
  difficulty: number;
  importance: number;
  memo: string;
}

const EMPTY_FORM: FormState = {
  wordbookId: "",
  term: "",
  meaning: "",
  reading: "",
  example: "",
  exampleMeaning: "",
  partOfSpeech: "",
  difficulty: 3,
  importance: 3,
  memo: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wordbooks: WordbookView[];
  /** 고칠 단어. 없으면 새로 넣기 */
  target?: Word | null;
  /** 새로 넣을 때 미리 골라둘 단어장 */
  defaultWordbookId?: string | null;
}

export function WordFormDialog({
  open,
  onOpenChange,
  wordbooks,
  target,
  defaultWordbookId,
}: Props) {
  const t = useTranslations();
  const feedback = useServiceFeedback();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  /** 같은 단어가 이미 있을 때 물어보는 창에 쓸 값 */
  const [duplicate, setDuplicate] = useState<Word | null>(null);

  const isEdit = target != null;

  useEffect(() => {
    if (!open) return;
    setDuplicate(null);
    if (target != null) {
      setForm({
        wordbookId: target.wordbookId,
        term: target.term,
        meaning: target.meaning,
        reading: target.reading,
        example: target.example,
        exampleMeaning: target.exampleMeaning,
        partOfSpeech: target.partOfSpeech,
        difficulty: target.difficulty,
        importance: target.importance,
        memo: target.memo,
      });
      return;
    }
    setForm({
      ...EMPTY_FORM,
      wordbookId: defaultWordbookId ?? wordbooks[0]?.id ?? "",
    });
  }, [open, target, defaultWordbookId, wordbooks]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (isEdit) {
      const { wordbookId: _ignored, ...editInput } = form;
      const done = feedback(editWord(target.id, editInput), {
        successMessage: t("word.updated"),
      });
      if (done) onOpenChange(false);
      return;
    }

    const result = addWord(form);
    if (!result.ok) {
      feedback(result);
      return;
    }

    // 같은 단어가 이미 있으면 여기서 멈추고 물어본다
    if (result.data.kind === "duplicated") {
      setDuplicate(result.data.existing);
      return;
    }

    feedback(result, { successMessage: t("word.added") });
    onOpenChange(false);
  };

  /** 물어본 뒤 사용자가 고른 대로 다시 넣는다 */
  const handleDuplicateChoice = (action: "edit" | "addNew") => {
    const result = addWord(form, action);
    const done = feedback(result, {
      successMessage: action === "edit" ? t("word.updated") : t("word.added"),
    });
    setDuplicate(null);
    if (done) onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {isEdit ? t("word.editTitle") : t("word.addTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {!isEdit && (
              <div className="grid gap-2">
                <Label htmlFor="word-wordbook">{t("wordbook.title")}</Label>
                <Select
                  value={form.wordbookId}
                  onValueChange={(value) => set("wordbookId", value ?? "")}
                >
                  {/* 값만 주면 단어장 식별자가 그대로 보인다 — 이름을 직접 넘긴다 */}
                  <SelectTrigger id="word-wordbook">
                    <SelectValue placeholder={t("wordbook.selectPlaceholder")}>
                      {wordbooks.find((wordbook) => wordbook.id === form.wordbookId)?.name ??
                        t("wordbook.selectPlaceholder")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {wordbooks.map((wordbook) => (
                      <SelectItem key={wordbook.id} value={wordbook.id}>
                        {wordbook.name} · {t(`lang.${wordbook.lang}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <Label htmlFor="word-term">{t("word.term")}</Label>
                <Input
                  id="word-term"
                  value={form.term}
                  onChange={(event) => set("term", event.target.value)}
                  placeholder={t("word.termPlaceholder")}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="word-meaning">{t("word.meaning")}</Label>
                <Input
                  id="word-meaning"
                  value={form.meaning}
                  onChange={(event) => set("meaning", event.target.value)}
                  placeholder={t("word.meaningPlaceholder")}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="word-reading">
                {t("word.reading")}
                <span className="ml-1 text-xs text-muted-foreground">
                  {t("common.optional")}
                </span>
              </Label>
              <Input
                id="word-reading"
                value={form.reading}
                onChange={(event) => set("reading", event.target.value)}
                placeholder={t("word.readingPlaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="word-example">
                {t("word.example")}
                <span className="ml-1 text-xs text-muted-foreground">
                  {t("common.optional")}
                </span>
              </Label>
              <Textarea
                id="word-example"
                value={form.example}
                onChange={(event) => set("example", event.target.value)}
                placeholder={t("word.examplePlaceholder")}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="word-example-meaning">{t("word.exampleMeaning")}</Label>
              <Textarea
                id="word-example-meaning"
                value={form.exampleMeaning}
                onChange={(event) => set("exampleMeaning", event.target.value)}
                placeholder={t("word.exampleMeaningPlaceholder")}
                rows={2}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="word-pos">{t("word.partOfSpeech")}</Label>
                <Input
                  id="word-pos"
                  value={form.partOfSpeech}
                  onChange={(event) => set("partOfSpeech", event.target.value)}
                  placeholder={t("word.partOfSpeechPlaceholder")}
                />
              </div>
              <GradeField
                kind="difficulty"
                id="word-difficulty"
                label={t("word.difficulty")}
                value={form.difficulty}
                onChange={(value) => set("difficulty", value)}
              />
              {/* 중요도 — 내가 넣는 단어는 「보통」에서 시작한다(계획서 6-2) */}
              <GradeField
                kind="importance"
                id="word-importance"
                label={t("word.importance")}
                value={form.importance}
                onChange={(value) => set("importance", value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="word-memo">{t("word.memo")}</Label>
              <Textarea
                id="word-memo"
                value={form.memo}
                onChange={(event) => set("memo", event.target.value)}
                placeholder={t("word.memoPlaceholder")}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 같은 단어가 이미 있을 때 — 계획서 행위 5 의 분기 */}
      <AlertDialog
        open={duplicate !== null}
        onOpenChange={(next) => {
          if (!next) setDuplicate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {t("word.duplicateTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("word.duplicateBody", {
                term: duplicate?.term ?? "",
                meaning: duplicate?.meaning ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <Button variant="secondary" onClick={() => handleDuplicateChoice("addNew")}>
              {t("word.duplicateAddNew")}
            </Button>
            <AlertDialogAction onClick={() => handleDuplicateChoice("edit")}>
              {t("word.duplicateEdit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * 난이도·중요도 고르기 한 칸.
 *
 * 🚨 숫자만 보여 주면 1 이 어려운 쪽인지 5 가 어려운 쪽인지 알 수 없다.
 *    그래서 고른 값·목록 양쪽에 뜻 낱말을 붙이고, 아래에 한 줄 안내를 둔다
 *    (공부할 범위 고르기 화면과 같은 규칙 — 두 화면의 말이 달라지면 더 헷갈린다).
 */
function GradeField({
  kind,
  id,
  label,
  value,
  onChange,
}: {
  kind: GradeKind;
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const t = useTranslations();

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
        <SelectTrigger id={id}>
          <SelectValue>
            {value} <span className="text-muted-foreground">{t(`grade.${kind}${value}`)}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {GRADE_LEVELS.map((level) => (
            <SelectItem key={level} value={String(level)}>
              {level} <span className="text-muted-foreground">{t(`grade.${kind}${level}`)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground/80">{t(`grade.${kind}Hint`)}</p>
    </div>
  );
}
