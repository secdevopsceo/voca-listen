#!/usr/bin/env python3
"""
voca-listen 앱 아이콘 생성 (Amber Frequency)

한 음절이 공기를 지나간 흔적을 눈금 위에 새긴 관측 도판 — 을 아이콘 크기로 압축한다.
작은 크기(192px)에서도 읽히도록 요소는 넷뿐이다: 바탕의 온도, 다이얼 눈금, 파형 기둥, 기준선.

내보내는 파일:
  public/icon-192.png          홈화면 아이콘
  public/icon-512.png          큰 아이콘
  public/icon-maskable-512.png 안드로이드 마스크용(안전 영역 안으로 마크를 줄인 판)
  public/apple-icon.png        iOS 홈화면
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT_DIR = Path(__file__).resolve().parent.parent / "public"

# 팔레트 — globals.css 의 앰버/크림과 같은 계열
INK_TOP = (94, 41, 18)      # 밤에 잠긴 구리빛 (위)
INK_BOTTOM = (150, 68, 26)  # 다이얼 불빛이 닿은 아래
CREAM = (247, 242, 234)
AMBER = (232, 163, 61)

# 파형 기둥의 높이 비율 — 한 문장을 소리 내어 읽을 때의 호흡 곡선
BAR_RATIOS = (0.34, 0.62, 1.00, 0.72, 0.44)


def vertical_gradient(size: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    """위에서 아래로 아주 미세하게 옮겨가는 농도의 층. 알아채지 못한 채 따뜻하면 성공."""
    base = Image.new("RGB", (1, size))
    draw = ImageDraw.Draw(base)
    for y in range(size):
        # 가운데가 살짝 밝게 부풀도록 완만한 곡선을 준다
        ratio = y / max(size - 1, 1)
        eased = ratio ** 0.85
        color = tuple(round(top[i] + (bottom[i] - top[i]) * eased) for i in range(3))
        draw.point((0, y), fill=color)
    return base.resize((size, size), Image.LANCZOS)


def draw_icon(size: int, *, mark_scale: float, rounded: bool) -> Image.Image:
    """아이콘 한 장을 그린다. mark_scale 은 마크가 차지하는 폭의 비율."""
    # 4배로 크게 그린 뒤 줄여서 가장자리를 매끈하게 만든다
    ss = 4
    canvas = size * ss
    image = vertical_gradient(canvas, INK_TOP, INK_BOTTOM).convert("RGBA")
    draw = ImageDraw.Draw(image)

    center = canvas / 2
    mark_width = canvas * mark_scale

    # ── 다이얼 눈금 ─────────────────────────────────────────────
    # 여섯 개마다 하나만 길게 — 규칙적인 간격 안의 미세한 강세.
    # 눈금은 아래로 자라 파형 쪽을 향한다(위에 떠 있지 않고 한 덩어리가 되도록).
    tick_count = 25
    tick_span = mark_width * 1.02
    tick_baseline = center - mark_width * 0.50
    tick_gap = tick_span / (tick_count - 1)
    for i in range(tick_count):
        x = center - tick_span / 2 + i * tick_gap
        is_major = i % 6 == 0
        length = canvas * (0.030 if is_major else 0.015)
        width = max(1, round(canvas * (0.0050 if is_major else 0.0032)))
        alpha = 145 if is_major else 82
        draw.line(
            [(x, tick_baseline - length), (x, tick_baseline)],
            fill=CREAM + (alpha,),
            width=width,
        )

    # ── 파형 기둥 ───────────────────────────────────────────────
    bar_count = len(BAR_RATIOS)
    # 기둥과 사이 간격의 비율을 고정해 어느 크기에서도 같은 리듬이 나오게 한다
    unit = mark_width / (bar_count + (bar_count - 1) * 0.62)
    bar_w = unit
    gap = unit * 0.62
    max_h = mark_width * 0.78
    baseline = center + mark_width * 0.40
    start_x = center - mark_width / 2

    for i, ratio in enumerate(BAR_RATIOS):
        height = max_h * ratio
        x0 = start_x + i * (bar_w + gap)
        y0 = baseline - height
        radius = bar_w / 2
        # 가운데 기둥만 앰버로 — 정점에 한 번의 강세
        fill = AMBER if i == bar_count // 2 else CREAM
        draw.rounded_rectangle(
            [(x0, y0), (x0 + bar_w, baseline)],
            radius=radius,
            fill=fill,
        )

    # ── 기준선 ─────────────────────────────────────────────────
    # 기둥이 서 있는 바닥. 양 끝으로 갈수록 옅어지도록 세 겹으로 나눠 긋는다
    line_y = baseline + canvas * 0.042
    half = mark_width * 0.57
    for frac, alpha in ((1.0, 60), (0.72, 110), (0.34, 190)):
        draw.line(
            [(center - half * frac, line_y), (center + half * frac, line_y)],
            fill=CREAM + (alpha,),
            width=max(1, round(canvas * 0.0045)),
        )

    image = image.resize((size, size), Image.LANCZOS)

    if rounded:
        # iOS 이전 버전과 브라우저 탭에서 각진 모서리로 보이지 않게 다듬는다
        radius = round(size * 0.22)
        mask = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [(0, 0), (size * 4 - 1, size * 4 - 1)], radius=radius * 4, fill=255
        )
        mask = mask.resize((size, size), Image.LANCZOS)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(image, (0, 0), mask)
        return out

    return image


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 보통 아이콘 — 마크가 넉넉히 차지한다
    draw_icon(192, mark_scale=0.56, rounded=True).save(OUT_DIR / "icon-192.png")
    draw_icon(512, mark_scale=0.56, rounded=True).save(OUT_DIR / "icon-512.png")
    draw_icon(180, mark_scale=0.56, rounded=True).save(OUT_DIR / "apple-icon.png")

    # 마스크용 — 안드로이드가 가장자리를 잘라내므로 안전 영역(가운데 80%) 안으로 줄인다
    draw_icon(512, mark_scale=0.40, rounded=False).save(OUT_DIR / "icon-maskable-512.png")

    for name in ("icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-icon.png"):
        path = OUT_DIR / name
        with Image.open(path) as img:
            print(f"{name:28s} {img.size[0]}x{img.size[1]}  {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
