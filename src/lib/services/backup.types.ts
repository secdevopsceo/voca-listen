/**
 * 백업 service 의 화면 ↔ service 공유 타입
 */

/** 가져오기 결과 — 무엇이 얼마나 들어갔는지 화면에 알려준다 */
export interface ImportResult {
  createdWordbookCount: number;
  createdWordCount: number;
  updatedWordCount: number;
  /** 같은 단어라서 건너뛴 수 */
  skippedWordCount: number;
  /** 함께 들어온 학습 기록 수 (CSV 는 항상 0) */
  importedRecordCount: number;
}

/** 내보낸 파일 */
export interface ExportedFile {
  fileName: string;
  /** 파일 내용 */
  content: string;
  /** 브라우저가 내려받을 때 쓰는 형식 */
  mimeType: string;
}
