"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAdminAgentAttendance,
  getAdminManagerAttendance,
  getManagerTeamAttendance,
} from "@/lib/attendance/client";
import type { AttendanceLiveStatus, AttendanceSummaryRow } from "@/lib/attendance/types";
import { useAttendanceLivePoll, todayAttendanceDate } from "@/hooks/use-attendance-live-poll";

export type WorkforceAudience = "manager-agents" | "admin-agents" | "admin-managers";

export type WorkforcePresenceKpis = {
  tracked: number;
  online: number;
  idle: number;
  offline: number;
  activeMinutes: number;
};

export function useWorkforcePresence(
  audience: WorkforceAudience,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const [items, setItems] = useState<AttendanceSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const initialLoadDone = useRef(false);

  const fetcher = useCallback(async () => {
    return audience === "manager-agents"
      ? getManagerTeamAttendance()
      : audience === "admin-agents"
        ? getAdminAgentAttendance()
        : getAdminManagerAttendance();
  }, [audience]);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      setError("");

      try {
        const response = await fetcher();
        setItems(response.items);
        initialLoadDone.current = true;
      } catch (err) {
        setItems([]);
        setError(err instanceof Error ? err.message : "Unable to load workforce presence.");
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [fetcher],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void load();
  }, [enabled, load]);

  useAttendanceLivePoll(enabled, () => {
    if (!initialLoadDone.current) return;
    void load({ silent: true });
  }, 90_000);

  const presenceByAccount = useMemo(() => {
    const map: Record<string, AttendanceLiveStatus> = {};
    for (const item of items) {
      map[item.account_id] = item.live_status;
    }
    return map;
  }, [items]);

  const kpis = useMemo<WorkforcePresenceKpis>(() => {
    const attended = items.filter(
      (item) => item.session_count > 0 || item.live_status !== "offline" || item.active_minutes > 0,
    );
    const online = items.filter((item) => item.live_status === "online").length;
    const idle = items.filter((item) => item.live_status === "idle").length;
    const offline = items.filter((item) => item.live_status === "offline").length;
    return {
      tracked: attended.length,
      online,
      idle,
      offline,
      activeMinutes: items.reduce((sum, item) => sum + item.active_minutes, 0),
    };
  }, [items]);

  return { items, presenceByAccount, kpis, loading, error, date: todayAttendanceDate() };
}
