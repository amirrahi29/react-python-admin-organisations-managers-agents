"use client";

import { useEffect, useRef } from "react";

export const ATTENDANCE_LIVE_POLL_MS = 60_000;

export function todayAttendanceDate() {
  return new Date().toISOString().slice(0, 10);
}

export function isAttendanceToday(date: string) {
  return date === todayAttendanceDate();
}

export function useAttendanceLivePoll(
  enabled: boolean,
  onTick: () => void,
  intervalMs = ATTENDANCE_LIVE_POLL_MS,
) {
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      onTickRef.current();
    };

    tick();

    const timer = window.setInterval(tick, intervalMs);

    const handleVisibility = () => {
      if (!document.hidden) {
        tick();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, intervalMs]);
}
