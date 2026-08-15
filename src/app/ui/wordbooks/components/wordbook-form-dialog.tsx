/**
 * 단어장 만들기 · 고치기 창
 * 계획서 행위 2(만들기) · 3(이름·언어 바꾸기)를 화면에서 부르는 자리.
 */

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWordbook, renameWordbook } from "@/lib/services/wordbook";
import type { LangCode, Wordbook } from "@/lib/storage/_types";
import { useServiceFeedback } from "../../components/common/use-service-feedback";

const LANGS: LangCode[] = ["en", "ja", "fr"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 고칠 단어장. 없으면 새로 만들기 */
  target?: Wordbook | null;
}

export function WordbookFormDialog({ open, onOpenChange, target }: Props) {
  const t = useTranslations();
  const feedback = useServiceFeedback();
  const [name, setName] = useState("");
  const [lang, setLang] = useState<LangCode>("en");

  // 창이 열릴 때마다 값을 맞춰 넣는다
  useEffect(() => {
    if (!open) return;
    setName(target?.name ?? "");
    setLang(target?.lang ?? "en");
  }, [open, target]);

  const isEdit = target != null;

  const handleSubmit = () => {
    const input = { name, lang };
    const result = isEdit ? renameWordbook(target.id, input) : createWordbook(input);
    const done = feedback(result, {
      successMessage: isEdit ? t("wordbook.updated") : t("wordbook.created"),
    });
    if (done) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? t("wordbook.editTitle") : t("wordbook.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("common.tagline")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="wordbook-name">{t("wordbook.name")}</Label>
            <Input
              id="wordbook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("wordbook.namePlaceholder")}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="wordbook-lang">{t("lang.label")}</Label>
            <Select value={lang} onValueChange={(value) => setLang(value as LangCode)}>
              {/* 값만 주면 코드값(en·ja·fr)이 그대로 보인다 — 사람이 읽는 말을 직접 넘긴다 */}
              <SelectTrigger id="wordbook-lang">
                <SelectValue>{t(`lang.${lang}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGS.map((code) => (
                  <SelectItem key={code} value={code}>
                    {t(`lang.${code}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  );
}
