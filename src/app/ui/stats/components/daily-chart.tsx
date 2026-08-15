/**
 * 날짜별 정답률 그래프
 *
 * 막대로 그린다. 시험은 "그날 봤다/안 봤다" 로 끊기는 일이라 이어진 선보다 막대가 맞고,
 * 무엇보다 시험을 한 번만 본 날에도 제대로 보인다(선 그래프는 점이 둘 이상이어야 그려진다).
 * 색은 CSS 변수(차트 팔레트)만 쓴다 — 하드코딩 색상 금지.
 */

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyScorePoint } from "@/lib/services/stats.types";

export function DailyChart({ points }: { points: DailyScorePoint[] }) {
  return (
    <div className="w-full">
      {/*
        높이를 숫자로 고정한다. 100% 로 두면 첫 렌더에서 부모 높이를 아직 못 재
        "width(-1) and height(-1)" 경고가 콘솔에 남는다.
      */}
      <ResponsiveContainer width="100%" height={208}>
        <BarChart data={points} margin={{ top: 12, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            stroke="var(--color-muted-foreground)"
            // 날짜는 월-일만 보여 좁은 화면에서도 읽히게 한다
            tickFormatter={(value: string) => String(value).slice(5)}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickLine={false}
            axisLine={false}
            width={38}
            fontSize={11}
            stroke="var(--color-muted-foreground)"
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: 12,
              color: "var(--color-popover-foreground)",
            }}
            formatter={(value) => [`${value ?? 0}%`, ""]}
          />
          <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} maxBarSize={44}>
            {points.map((point) => (
              // 잘한 날은 진하게, 아쉬운 날은 옅게 — 한눈에 흐름이 보이도록
              <Cell
                key={point.date}
                fill="var(--color-chart-1)"
                fillOpacity={0.35 + (point.accuracy / 100) * 0.65}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
