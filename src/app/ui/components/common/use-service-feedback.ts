/**
 * service 결과를 화면에 알려주는 공통 처리
 * 실패 사유 코드를 i18n 문구로 바꿔 토스트로 띄운다(문구 하드코딩 금지).
 */

"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ServiceResult } from "@/lib/services/_result";
import { dataChanged } from "@/store/slice/uiSlice";
import { useAppDispatch } from "@/store/hooks";

export function useServiceFeedback() {
  const t = useTranslations("error");
  const dispatch = useAppDispatch();

  /**
   * 성공하면 onSuccess 를 부르고 화면을 다시 읽게 한다.
   * 실패하면 사유를 토스트로 띄우고 false 를 돌려준다.
   */
  return useCallback(
    <T>(
      result: ServiceResult<T>,
      options: { onSuccess?: (data: T) => void; successMessage?: string; refresh?: boolean } = {},
    ): boolean => {
      if (!result.ok) {
        toast.error(t(result.reason));
        return false;
      }

      options.onSuccess?.(result.data);
      if (options.successMessage !== undefined) toast.success(options.successMessage);
      if (options.refresh !== false) dispatch(dataChanged());
      return true;
    },
    [t, dispatch],
  );
}
