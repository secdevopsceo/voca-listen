/**
 * 단어 입력 공유 스키마
 * 화면과 service 가 같은 것을 쓴다(default-rules.md 제5장 "Zod (유효성 검증)" 의 단일 소스).
 */

import { z } from "zod";

/** 안 채워도 되는 글자 칸 — 비어 있으면 빈 문자열로 통일한다 */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}은(는) ${max}자까지 쓸 수 있어요`)
    .optional()
    .transform((value) => value ?? "");

export const wordInputSchema = z.object({
  wordbookId: z.string().min(1, "단어장을 골라 주세요"),
  term: z.string().trim().min(1, "단어를 입력해 주세요").max(100, "단어는 100자까지 쓸 수 있어요"),
  meaning: z.string().trim().min(1, "뜻을 입력해 주세요").max(500, "뜻은 500자까지 쓸 수 있어요"),
  reading: optionalText(200, "발음 표기"),
  example: optionalText(500, "예문"),
  exampleMeaning: optionalText(500, "예문 뜻"),
  partOfSpeech: optionalText(50, "품사"),
  difficulty: z
    .number()
    .int("난이도는 정수여야 해요")
    .min(1, "난이도는 1부터 5까지예요")
    .max(5, "난이도는 1부터 5까지예요")
    // 내가 넣는 단어는 어렵지도 쉽지도 않은 「보통」에서 시작한다(계획서 6-2)
    .default(3),
  importance: z
    .number()
    .int("중요도는 정수여야 해요")
    .min(1, "중요도는 1부터 5까지예요")
    .max(5, "중요도는 1부터 5까지예요")
    .default(3),
  memo: optionalText(1000, "메모"),
});

export type WordInput = z.infer<typeof wordInputSchema>;

/** 단어를 고칠 때는 단어장을 바꾸지 않는다 */
export const wordEditSchema = wordInputSchema.omit({ wordbookId: true });

export type WordEditInput = z.infer<typeof wordEditSchema>;
