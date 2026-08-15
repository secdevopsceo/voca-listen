/**
 * service 공통 결과 타입
 *
 * service 는 예외를 던지는 대신 성공/실패를 값으로 돌려준다.
 * 실패 사유는 코드(영어)로 주고, 화면이 그 코드를 i18n 키로 바꿔 사람 말로 보여준다
 * (default-rules.md 제3장 "코드 = 영어" · 제5장 "노출 문자열 하드코딩 금지").
 */

/** service 가 돌려줄 수 있는 실패 사유 */
export type FailureReason =
  | "wordbookNotFound"
  | "wordbookNameRequired"
  | "wordbookNameDuplicated"
  | "wordbookIsDefault"
  | "wordbookInTrash"
  | "wordNotFound"
  | "wordDuplicated"
  | "invalidInput"
  | "notEnoughWords"
  | "noAnswers"
  | "invalidBackupFile"
  | "storageFull";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: FailureReason; message?: string };

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function fail<T>(reason: FailureReason, message?: string): ServiceResult<T> {
  return { ok: false, reason, message };
}
