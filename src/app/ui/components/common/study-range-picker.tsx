/**
 * 공부할 범위 고르기 — 듣기 학습 · 시험 · 단어장 목록 세 화면이 함께 쓴다
 *
 * 계획서 6-1:
 * - 처음 값은 설정 화면에서 정한 기본값
 * - 각 화면에서 임시로 바꿀 수 있고 그 값은 저장하지 않는다
 * - 걸러져 안 보이는 단어가 **실제로 있을 때만** 개수와 함께 안내한다
 *
 * 🚨 내가 직접 넣은 단어는 중요도·난이도가 「보통(3)」이라 범위를 좁히면 빠질 수 있다.
 *    그래서 안내 문구에 그 사실을 함께 적는다(인터뷰에서 요청받은 가이드).
 *
 * 🚨 숫자만 놓으면 1 이 어려운 쪽인지 5 가 어려운 쪽인지 알 수 없다.
 *    그래서 줄마다 「1 = …, 5 = …」 한 줄을 붙이고, 목록에도 뜻 낱말을 함께 보여 준다.
 */

"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GRADE_LEVELS, isWholeRange, type GradeKind } from "@/lib/study-range";
import type { StudyRange } from "@/store/slice/uiSlice";

interface Props {
  range: StudyRange;
  onChange: (next: StudyRange) => void;
  /** 범위 때문에 빠진 단어 수. 0 이면 안내를 띄우지 않는다 */
  hiddenCount: number;
}

export function StudyRangePicker({ range, onChange, hiddenCount }: Props) {
  const t = useTranslations();

  const set = <K extends keyof StudyRange>(key: K, value: number) => {
    const next = { ...range, [key]: value };
    // 최솟값이 최댓값을 넘으면 나머지 한쪽을 끌어와 뒤집히지 않게 한다
    if (next.importanceMin > next.importanceMax) {
      if (key === "importanceMin") next.importanceMax = value;
      else next.importanceMin = value;
    }
    if (next.difficultyMin > next.difficultyMax) {
      if (key === "difficultyMin") next.difficultyMax = value;
      else next.difficultyMin = value;
    }
    onChange(next);
  };

  return (
    <div className="rounded-lg border border-border/70 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
        <p className="flex-1 text-sm">{t("study.title")}</p>
        {!isWholeRange(range) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() =>
              onChange({
                importanceMin: 1,
                importanceMax: 5,
                difficultyMin: 1,
                difficultyMax: 5,
              })
            }
          >
            {t("study.reset")}
          </Button>
        )}
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <RangeRow
          kind="importance"
          label={t("study.importanceLabel")}
          minId="study-importance-min"
          maxId="study-importance-max"
          min={range.importanceMin}
          max={range.importanceMax}
          onMin={(value) => set("importanceMin", value)}
          onMax={(value) => set("importanceMax", value)}
        />
        <RangeRow
          kind="difficulty"
          label={t("study.difficultyLabel")}
          minId="study-difficulty-min"
          maxId="study-difficulty-max"
          min={range.difficultyMin}
          max={range.difficultyMax}
          onMin={(value) => set("difficultyMin", value)}
          onMax={(value) => set("difficultyMax", value)}
        />
      </div>

      {hiddenCount > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("study.filteredNotice", { count: hiddenCount })} {t("study.ownWordsHint")}
        </p>
      )}
    </div>
  );
}

/** 한 줄에 「최소 ~ 최대」 두 칸 + 어느 쪽이 큰 값인지 알려주는 안내 */
function RangeRow({
  kind,
  label,
  minId,
  maxId,
  min,
  max,
  onMin,
  onMax,
}: {
  kind: GradeKind;
  label: string;
  minId: string;
  maxId: string;
  min: number;
  max: number;
  onMin: (value: number) => void;
  onMax: (value: number) => void;
}) {
  const t = useTranslations();

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-xs text-muted-foreground">{label}</span>
        <GradeSelect kind={kind} id={minId} value={min} onChange={onMin} />
        <span className="text-xs text-muted-foreground">~</span>
        <GradeSelect kind={kind} id={maxId} value={max} onChange={onMax} />
      </div>
      <p className="mt-1 pl-14 text-[11px] text-muted-foreground/80">
        {t(`grade.${kind}Hint`)}
      </p>
    </div>
  );
}

function GradeSelect({
  kind,
  id,
  value,
  onChange,
}: {
  kind: GradeKind;
  id: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const t = useTranslations();

  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      {/* 칸이 좁아 고른 값은 숫자만, 뜻 낱말은 목록을 열었을 때 보여 준다 */}
      <SelectTrigger id={id} className="h-8 flex-1">
        <SelectValue>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {GRADE_LEVELS.map((level) => (
          <SelectItem key={level} value={String(level)}>
            {level} <span className="text-muted-foreground">{t(`grade.${kind}${level}`)}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
