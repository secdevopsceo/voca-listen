/**
 * 단어장 service 의 화면 ↔ service 공유 타입
 * 화면과 service 양쪽이 이 파일을 import 한다(수기 중복 선언 금지).
 */

import type { Wordbook } from "@/lib/storage/_types";

/** 화면 목록에 쓰는 단어장 — 단어 수를 함께 담는다 */
export interface WordbookView extends Wordbook {
  /** 이 단어장에 든 단어 수 (휴지통 제외) */
  wordCount: number;
}

/** 단어장을 휴지통에 넣은 결과 */
export interface TrashWordbookResult {
  wordbook: Wordbook;
  /** 함께 휴지통으로 간 단어 수 */
  trashedWordCount: number;
}
