import { useCallback, useEffect, useRef, useState } from "react";
import type { FlashMessage, FlashMessageType } from "./dashboard-flash";

export function useFlashMessage() {
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
  const [isFlashVisible, setIsFlashVisible] = useState(false);

  const enterTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (enterTimerRef.current !== null) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }

    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (cleanupTimerRef.current !== null) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
  }, []);

  const dismissFlash = useCallback(() => {
    clearTimers();
    setIsFlashVisible(false);

    cleanupTimerRef.current = window.setTimeout(() => {
      setFlashMessage(null);
      cleanupTimerRef.current = null;
    }, 250);
  }, [clearTimers]);

  const showFlash = useCallback(
    (message: string, type: FlashMessageType = "success") => {
      clearTimers();

      setFlashMessage({ type, message });
      setIsFlashVisible(false);

      enterTimerRef.current = window.setTimeout(() => {
        setIsFlashVisible(true);
      }, 80);

      exitTimerRef.current = window.setTimeout(() => {
        setIsFlashVisible(false);
      }, 4200);

      cleanupTimerRef.current = window.setTimeout(() => {
        setFlashMessage(null);
      }, 4550);
    },
    [clearTimers]
  );

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    flashMessage,
    isFlashVisible,
    showFlash,
    dismissFlash,
  };
}
