/**
 * TTS 훅 (Web Speech API)
 *
 * init-dev 의 useTTS 를 이식하면서 다음을 더했다.
 * - 언어별 음성 고르기(일본어·프랑스어·한국어) — lib/tts/voices
 * - 여러 항목을 차례로 읽는 자동 연속 재생 + 반복·간격
 * - 소리를 못 내는 환경을 화면이 알 수 있게 isSupported 를 준다
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TtsGender } from "@/lib/storage/_types";
import type { SpeakItem } from "@/lib/tts/items";
import { pickVoice } from "@/lib/tts/voices";

interface UseTtsOptions {
  /** 읽기 속도 0.5 ~ 2 */
  rate?: number;
  gender?: TtsGender;
}

interface SpeakQueueOptions {
  /** 각 항목을 몇 번씩 읽을지 */
  repeat?: number;
  /** 항목 사이 쉬는 시간(밀리초) */
  gapMs?: number;
  /** 한 항목을 읽기 시작할 때 */
  onItemStart?: (item: SpeakItem, index: number) => void;
  /** 큐를 끝까지 읽었을 때 (중간에 멈추면 부르지 않는다) */
  onDone?: () => void;
}

export interface UseTtsReturn {
  /** 한 덩어리만 읽는다 (스피커 버튼) */
  speak: (text: string, bcp47: string) => void;
  /** 여러 덩어리를 차례로 읽는다 (자동 연속 재생) */
  speakQueue: (items: SpeakItem[], options?: SpeakQueueOptions) => void;
  /** 읽기를 멈춘다 */
  stop: () => void;
  isSpeaking: boolean;
  /** 이 브라우저가 소리 읽기를 지원하는지 */
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
}

export function useTTS(options: UseTtsOptions = {}): UseTtsReturn {
  const { rate = 1, gender = "female" } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  /** 멈춤 요청이 들어왔는지 — 큐가 다음 항목으로 넘어가지 않게 막는다 */
  const cancelledRef = useRef(false);
  /** 쉬는 시간 타이머 — 멈출 때 함께 지운다 */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 음성 목록 읽기 (크롬은 voiceschanged 이후에야 목록이 찬다)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    setIsSupported(true);

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  // 화면을 떠날 때 읽던 것을 멈춘다
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  /** 한 덩어리를 읽고, 다 읽으면 resolve 한다 */
  const speakOnce = useCallback(
    (text: string, bcp47: string): Promise<void> =>
      new Promise((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = bcp47;
        utterance.rate = rate;

        const voice = pickVoice(window.speechSynthesis.getVoices(), bcp47, gender);
        if (voice !== null) utterance.voice = voice;

        utterance.onend = () => resolve();
        // 실패해도 큐가 멈추지 않도록 똑같이 resolve 한다
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
      }),
    [rate, gender],
  );

  const speak = useCallback(
    (text: string, bcp47: string) => {
      if (!isSupported || text.trim() === "") return;
      cancelledRef.current = false;
      window.speechSynthesis.cancel();
      setIsSpeaking(true);
      void speakOnce(text, bcp47).then(() => {
        if (!cancelledRef.current) setIsSpeaking(false);
      });
    },
    [isSupported, speakOnce],
  );

  const speakQueue = useCallback(
    (items: SpeakItem[], queueOptions: SpeakQueueOptions = {}) => {
      if (!isSupported || items.length === 0) return;

      const { repeat = 1, gapMs = 800, onItemStart, onDone } = queueOptions;

      cancelledRef.current = false;
      window.speechSynthesis.cancel();
      setIsSpeaking(true);

      const wait = (ms: number) =>
        new Promise<void>((resolve) => {
          timerRef.current = setTimeout(resolve, ms);
        });

      const run = async () => {
        for (let index = 0; index < items.length; index += 1) {
          if (cancelledRef.current) return;
          const item = items[index];

          for (let turn = 0; turn < repeat; turn += 1) {
            if (cancelledRef.current) return;
            if (turn === 0) onItemStart?.(item, index);
            await speakOnce(item.text, item.bcp47);
            if (cancelledRef.current) return;
            // 마지막 항목의 마지막 반복 뒤에는 쉬지 않는다
            const isLast = index === items.length - 1 && turn === repeat - 1;
            if (!isLast && gapMs > 0) await wait(gapMs);
          }
        }

        if (cancelledRef.current) return;
        setIsSpeaking(false);
        onDone?.();
      };

      void run();
    },
    [isSupported, speakOnce],
  );

  return { speak, speakQueue, stop, isSpeaking, isSupported, voices };
}
