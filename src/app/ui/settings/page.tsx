/**
 * 설정 화면
 * 소리 읽기(계획서 행위 14) · 화면 · 데이터 내보내기/가져오기(행위 13)를 다룬다.
 */

"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Download, Upload, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useSettings } from "@/hooks/useSettings";
import { useStudyRange } from "@/hooks/useStudyRange";
import { useTTS } from "@/hooks/useTTS";
import type { ImportConflictMode } from "@/lib/schemas/backup";
import { exportCsv, exportJson, importCsv, importJson } from "@/lib/services/backup";
import type { ExportedFile } from "@/lib/services/backup.types";
import {
  TTS_GAP_MAX_MS,
  TTS_GAP_MIN_MS,
  TTS_RATE_MAX,
  TTS_RATE_MIN,
  TTS_REPEAT_MAX,
  TTS_REPEAT_MIN,
} from "@/lib/services/settings";
import type { TtsGender, TtsReadScope } from "@/lib/storage/_types";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { KOREAN_BCP47 } from "@/lib/tts/voices";
import { StudyRangePicker } from "../components/common/study-range-picker";
import { useServiceFeedback } from "../components/common/use-service-feedback";

/** 만든 파일을 브라우저가 내려받게 한다 */
function downloadFile(file: ExportedFile) {
  const blob = new Blob([file.content], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { setRange } = useStudyRange();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { settings, update } = useSettings();
  const feedback = useServiceFeedback();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conflictMode, setConflictMode] = useState<ImportConflictMode>("skip");

  const { speak, isSupported } = useTTS({
    rate: settings.ttsRate,
    gender: settings.ttsGender,
  });

  /**
   * Select 에 보여줄 글자.
   * 값만 주면 저장된 코드값(female·term_meaning·dark 같은 것)이 그대로 화면에 나온다 —
   * 실제로 설정 화면 전체가 그렇게 보였다. 사람이 읽는 말을 직접 넘겨 막는다.
   */
  const genderLabel =
    settings.ttsGender === "male" ? t("settings.genderMale") : t("settings.genderFemale");
  const scopeLabel = {
    term: t("settings.scopeTerm"),
    term_meaning: t("settings.scopeTermMeaning"),
    term_meaning_example: t("settings.scopeTermMeaningExample"),
    term_meaning_example_meaning: t("settings.scopeTermMeaningExampleMeaning"),
  }[settings.ttsReadScope];
  const themeLabel =
    theme === "light"
      ? t("settings.themeLight")
      : theme === "dark"
        ? t("settings.themeDark")
        : t("settings.themeSystem");
  const localeLabel = locale === "en" ? t("settings.localeEn") : t("settings.localeKo");
  const conflictLabel =
    conflictMode === "overwrite" ? t("backup.conflictOverwrite") : t("backup.conflictSkip");

  const changeLocale = (next: string) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    update({ uiLocale: next === "en" ? "en" : "ko" });
    router.refresh();
  };

  const handleImport = async (file: File) => {
    const content = await file.text();
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const result = isCsv
      ? importCsv(content, conflictMode)
      : importJson(content, conflictMode);

    feedback(result, {
      successMessage: result.ok
        ? t("backup.imported", {
            wordbooks: result.data.createdWordbookCount,
            words: result.data.createdWordCount,
            updated: result.data.updatedWordCount,
            skipped: result.data.skippedWordCount,
          })
        : undefined,
    });
  };

  return (
    <div className="space-y-7">
      <h1 className="font-display text-lg">{t("settings.title")}</h1>

      {/* 소리 읽기 */}
      <section className="space-y-5">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("settings.ttsSection")}
        </h2>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label>{t("settings.rate")}</Label>
            <span className="font-mono text-xs tabular text-muted-foreground">
              {settings.ttsRate.toFixed(1)}x
            </span>
          </div>
          <Slider
            value={[settings.ttsRate]}
            min={TTS_RATE_MIN}
            max={TTS_RATE_MAX}
            step={0.1}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value;
              if (typeof next === "number") update({ ttsRate: next });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tts-gender">{t("settings.gender")}</Label>
          <Select
            value={settings.ttsGender}
            onValueChange={(value) => update({ ttsGender: (value ?? "female") as TtsGender })}
          >
            <SelectTrigger id="tts-gender" className="w-full">
              <SelectValue>{genderLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="female">{t("settings.genderFemale")}</SelectItem>
              <SelectItem value="male">{t("settings.genderMale")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tts-scope">{t("settings.readScope")}</Label>
          <Select
            value={settings.ttsReadScope}
            onValueChange={(value) =>
              update({ ttsReadScope: (value ?? "term_meaning") as TtsReadScope })
            }
          >
            <SelectTrigger id="tts-scope" className="w-full">
              <SelectValue>{scopeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="term">{t("settings.scopeTerm")}</SelectItem>
              <SelectItem value="term_meaning">{t("settings.scopeTermMeaning")}</SelectItem>
              <SelectItem value="term_meaning_example">
                {t("settings.scopeTermMeaningExample")}
              </SelectItem>
              <SelectItem value="term_meaning_example_meaning">
                {t("settings.scopeTermMeaningExampleMeaning")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label>{t("settings.repeat")}</Label>
            <span className="font-mono text-xs tabular text-muted-foreground">
              {t("settings.repeatValue", { count: settings.ttsRepeat })}
            </span>
          </div>
          <Slider
            value={[settings.ttsRepeat]}
            min={TTS_REPEAT_MIN}
            max={TTS_REPEAT_MAX}
            step={1}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value;
              if (typeof next === "number") update({ ttsRepeat: next });
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label>{t("settings.gap")}</Label>
            <span className="font-mono text-xs tabular text-muted-foreground">
              {t("settings.gapValue", { ms: settings.ttsGapMs })}
            </span>
          </div>
          <Slider
            value={[settings.ttsGapMs]}
            min={TTS_GAP_MIN_MS}
            max={TTS_GAP_MAX_MS}
            step={100}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value;
              if (typeof next === "number") update({ ttsGapMs: next });
            }}
          />
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={!isSupported}
          onClick={() => speak(t("settings.testVoiceText"), KOREAN_BCP47)}
        >
          <Volume2 className="size-4" />
          {t("settings.testVoice")}
        </Button>
      </section>

      {/* 화면 */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("settings.appearanceSection")}
        </h2>

        <div className="space-y-2">
          <Label htmlFor="theme">{t("settings.theme")}</Label>
          <Select value={theme ?? "system"} onValueChange={(value) => setTheme(value ?? "system")}>
            <SelectTrigger id="theme" className="w-full">
              <SelectValue>{themeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
              <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
              <SelectItem value="system">{t("settings.themeSystem")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locale">{t("settings.locale")}</Label>
          <Select value={locale} onValueChange={(value) => changeLocale(value ?? "ko")}>
            <SelectTrigger id="locale" className="w-full">
              <SelectValue>{localeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ko">{t("settings.localeKo")}</SelectItem>
              <SelectItem value="en">{t("settings.localeEn")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* 공부할 범위 — 듣기·시험·단어장이 이 값을 처음 값으로 쓴다(계획서 6-1) */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("settings.studyRange")}
        </h2>
        <StudyRangePicker
          range={{
            importanceMin: settings.studyImportanceMin,
            importanceMax: settings.studyImportanceMax,
            difficultyMin: settings.studyDifficultyMin,
            difficultyMax: settings.studyDifficultyMax,
          }}
          onChange={(next) => {
            update({
              studyImportanceMin: next.importanceMin,
              studyImportanceMax: next.importanceMax,
              studyDifficultyMin: next.difficultyMin,
              studyDifficultyMax: next.difficultyMax,
            });
            // 설정을 바꾸면 지금 보고 있는 화면도 그 값으로 맞춘다
            setRange(next);
          }}
          hiddenCount={0}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("settings.studyRangeHint")}
        </p>
      </section>

      {/* 데이터 */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("backup.title")}
        </h2>

        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={() => downloadFile(exportJson())}
          >
            <Download className="size-4" />
            <span className="flex flex-col items-start">
              {t("backup.exportJson")}
              <span className="text-[11px] font-normal text-muted-foreground">
                {t("backup.exportJsonHint")}
              </span>
            </span>
          </Button>

          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={() => downloadFile(exportCsv())}
          >
            <Download className="size-4" />
            <span className="flex flex-col items-start">
              {t("backup.exportCsv")}
              <span className="text-[11px] font-normal text-muted-foreground">
                {t("backup.exportCsvHint")}
              </span>
            </span>
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="conflict-mode">{t("backup.conflictLabel")}</Label>
          <Select
            value={conflictMode}
            onValueChange={(value) => setConflictMode((value ?? "skip") as ImportConflictMode)}
          >
            <SelectTrigger id="conflict-mode" className="w-full">
              <SelectValue>{conflictLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">{t("backup.conflictSkip")}</SelectItem>
              <SelectItem value="overwrite">{t("backup.conflictOverwrite")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) void handleImport(file);
            // 같은 파일을 다시 고를 수 있게 값을 비운다
            event.target.value = "";
          }}
        />
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          {t("backup.import")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("backup.importHint")}</p>
      </section>
    </div>
  );
}
