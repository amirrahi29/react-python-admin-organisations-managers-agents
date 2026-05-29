"use client";

import { useCallback, useEffect, useState } from "react";
import { AttendanceListPage } from "@/components/attendance/attendance-list-page";
import { AppTabBar } from "@/components/ui/app-tab-bar";
import { useAttendanceLivePoll, isAttendanceToday } from "@/hooks/use-attendance-live-poll";
import {
  getAdminAgentAttendance,
  getAdminAgentAttendanceDetail,
  getAdminManagerAttendance,
  getAdminManagerAttendanceDetail,
} from "@/lib/attendance/client";
import type { AttendanceDetailResponse, AttendanceSummaryRow } from "@/lib/attendance/types";

type AdminScope = "managers" | "agents";

export function AdminAttendancePage({ embedded = false }: { embedded?: boolean }) {
  const [scope, setScope] = useState<AdminScope>("managers");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<AttendanceSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AttendanceSummaryRow | null>(null);
  const [detail, setDetail] = useState<AttendanceDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError("");
    try {
      const response =
        scope === "managers"
          ? await getAdminManagerAttendance(date)
          : await getAdminAgentAttendance(date);
      setItems(response.items);
      setSelected((current) =>
        current ? response.items.find((item) => item.account_id === current.account_id) ?? null : null,
      );
    } catch (err) {
      if (!silent) {
        setItems([]);
      }
      setError(err instanceof Error ? err.message : "Unable to load attendance.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [scope, date]);

  useEffect(() => {
    void loadList(false);
  }, [loadList]);

  const refreshLive = useCallback(() => {
    void loadList(true);
    if (!selected) return;
    const loader =
      scope === "managers"
        ? getAdminManagerAttendanceDetail(selected.account_id, date)
        : getAdminAgentAttendanceDetail(selected.account_id, date);
    void loader.then(setDetail).catch(() => {
      // keep last snapshot
    });
  }, [date, loadList, scope, selected]);

  useAttendanceLivePoll(isAttendanceToday(date), refreshLive);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }

    setDetailLoading(true);
    const loader =
      scope === "managers"
        ? getAdminManagerAttendanceDetail(selected.account_id, date)
        : getAdminAgentAttendanceDetail(selected.account_id, date);

    void loader
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selected, scope, date]);

  return (
    <div className="space-y-4">
      <AppTabBar
        active={scope}
        onChange={(nextScope) => {
          setScope(nextScope as AdminScope);
          setSelected(null);
          setDetail(null);
        }}
        ariaLabel="Attendance scope"
        tabs={[
          { id: "managers", label: "Managers" },
          { id: "agents", label: "Agents" },
        ]}
      />

      <AttendanceListPage
        embedded={embedded}
        title={scope === "managers" ? "Manager attendance & performance" : "Agent attendance"}
        subtitle={
          scope === "managers"
            ? "Review each manager's login time, 9-hour target progress, session logs, and live presence."
            : "Organization-wide agent attendance with manager assignment and full session drill-down."
        }
        items={items}
        date={date}
        loading={loading}
        error={error}
        onDateChange={setDate}
        onSelect={setSelected}
        selectedAccountId={selected?.account_id ?? null}
        detail={detail}
        detailLoading={detailLoading}
        showManagerColumn={scope === "agents"}
        roleLabel={scope === "managers" ? "Manager" : "Agent"}
        perspective="review"
        activeLabel={scope === "managers" ? "Working" : "Active"}
        idleLabel={scope === "managers" ? "Away" : "Idle"}
      />
    </div>
  );
}
