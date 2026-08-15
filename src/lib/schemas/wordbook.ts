/**
 * 단어장 입력 공유 스키마
 * 화면과 service 가 같은 것을 쓴다(default-rules.md 제5장 "Zod (유효성 검증)" 의 단일 소스).
 * 서버 전용 import 를 넣지 않는다.
 */

import { z } from "zod";

/** 지원 언어 — 저장 항목의 LangCode 와 같은 값이어야 한다 */
export const langCodeSchema = z.enum(["en", "ja", "fr"]);

export const wordbookInputSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(50, "이름은 50자까지 쓸 수 있어요"),
  lang: langCodeSchema,
});

export type WordbookInput = z.infer<typeof wordbookInputSchema>;
export type LangCodeInput = z.infer<typeof langCodeSchema>;
