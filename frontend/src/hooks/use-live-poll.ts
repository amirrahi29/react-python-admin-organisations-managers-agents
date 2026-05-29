"use client";

import { useEffect, useRef } from "react";

/** Default cadence for silent dashboard polling. */
export const LIVE_POLL_DASHBOARD_MS = 60_000;

/** Run ``onTick`` on a fixed interval while the tab is visible. The first
 * invocation happens after ``intervalMs`` — callers are expected to do the
 * initial fetch themselves so SSR-prefetched data is honoured.
 *
 * Pauses while ``document.hidden`` (no waste of battery / API quota when the
 * user is on another tab) and resumes (with an immediate tick) on focus.
 */
export function useLivePoll(
  enabled: boolean,
  onTick: () => void,
  intervalMs = LIVE_POLL_DASHBOARD_MS,
) {
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      onTickRef.current();
    };

    const timer = window.setInterval(tick, intervalMs);

    const handleVisibility = () => {
      if (!document.hidden) tick();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, intervalMs]);
}
