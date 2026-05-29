"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLivePoll } from "@/hooks/use-live-poll";

type FetchFn<T> = () => Promise<T>;

type UseDashboardStatsOptions<T> = {
  fetcher: FetchFn<T>;
  /** Initial value shipped from the server (skips the post-hydration fetch). */
  initialStats?: T | null;
  /** Friendly error fallback when the fetcher throws. */
  errorMessage?: string;
  /** Toggles silent live polling. Defaults to ``true``. */
  poll?: boolean;
};

type UseDashboardStatsResult<T> = {
  stats: T | null;
  loading: boolean;
  error: string;
  refresh: (silent?: boolean) => Promise<void>;
};

/**
 * Shared fetch + silent live-poll machinery used by every dashboard surface
 * (admin landing, admin sub-analytics, manager dashboard, agent dashboard,
 * admin manager performance drill-down).
 *
 * Replaces the ~30-line refresh/useEffect/useLivePoll block that was copied
 * across 6+ files. Keeping it in one place means polling cadence, visibility
 * pause, and SSR-prefetch handling stay consistent everywhere.
 */
export function useDashboardStats<T>({
  fetcher,
  initialStats = null,
  errorMessage = "Unable to load dashboard stats.",
  poll = true,
}: UseDashboardStatsOptions<T>): UseDashboardStatsResult<T> {
  const [stats, setStats] = useState<T | null>(initialStats);
  const [loading, setLoading] = useState(initialStats === null);
  const [error, setError] = useState("");
  const hasInitialDataRef = useRef(initialStats !== null);
  const fetcherRef = useRef(fetcher);
  const errorMessageRef = useRef(errorMessage);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    errorMessageRef.current = errorMessage;
  }, [errorMessage]);

  const refresh = useCallback(async (silent = false) => {
    try {
      const next = await fetcherRef.current();
      setStats(next);
      hasInitialDataRef.current = true;
      if (!silent) setError("");
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : errorMessageRef.current);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialStats !== null) return;
    void refresh(false);
  }, [initialStats, refresh]);

  useLivePoll(poll, () => {
    if (!hasInitialDataRef.current) return;
    void refresh(true);
  });

  return { stats, loading, error, refresh };
}
