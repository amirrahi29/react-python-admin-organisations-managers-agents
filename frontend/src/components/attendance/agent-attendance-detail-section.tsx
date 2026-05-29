"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { AttendancePersonDetailPanel } from "@/components/attendance/attendance-person-detail-panel";
import { Alert } from "@/components/ui/alert";
import { FadeIn } from "@/components/ui/motion";
import { useAttendanceLivePoll, isAttendanceToday } from "@/hooks/use-attendance-live-poll";
import {
  ADMIN_ATTENDANCE_PATH,
  MANAGER_ATTENDANCE_PATH,
} from "@/lib/attendance/constants";
import {
  getAdminAgentAttendanceDetail,
  getManagerAgentAttendance,
} from "@/lib/attendance/client";
import type { AttendanceDetailResponse } from "@/lib/attendance/types";
import { todayInputValue } from "@/lib/utils";

type AttendanceDetailSectionProps = {
  accountId: string;
  scope: "manager" | "admin";
  subjectName?: string;
  agentName?: string;
  roleLabel?: "Agent" | "Manager";
  delay?: number;
};

export function AgentAttendanceDetailSection({
  accountId,
  scope,
  subjectName,
  agentName,
  roleLabel = "Agent",
  delay = 0,
}: AttendanceDetailSectionProps) {
  const displayName = subjectName ?? agentName ?? roleLabel;
  const [date, setDate] = useState(todayInputValue);
  const [detail, setDetail] = useState<AttendanceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError("");
    try {
      const response =
        scope === "manager"
          ? await getManagerAgentAttendance(accountId, date)
          : await getAdminAgentAttendanceDetail(accountId, date);
      setDetail(response);
    } catch (err) {
      if (!silent) {
        setDetail(null);
      }
      setError(err instanceof Error ? err.message : "Unable to load attendance.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [accountId, date, scope]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useAttendanceLivePoll(isAttendanceToday(date), () => {
    void load(true);
  });

  const viewAllHref = scope === "manager" ? MANAGER_ATTENDANCE_PATH : ADMIN_ATTENDANCE_PATH;

  return (
    <FadeIn delay={delay}>
      <section className="app-surface app-surface--elevated overflow-hidden p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">Attendance & performance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {`Same detailed view ${displayName} sees — 9-hour target, sessions, and activity logs.`}
          </p>
          {date ? (
            <p className="mt-2 text-xs font-medium text-muted-foreground">Date · {date}</p>
          ) : null}
        </div>
        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="attendance-date-field">
            <CalendarDays className="size-4 text-primary" />
            <span>Date</span>
            <input
              type="date"
              value={date}
              max={todayInputValue()}
              onChange={(event) => setDate(event.target.value)}
              className="attendance-date-field__input"
            />
          </label>
          <Link href={viewAllHref} className="manager-agent-table__link">
            View full attendance workspace
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="attendance-page-panel__loading mt-4">
            <div className="attendance-page-panel__skeleton attendance-page-panel__skeleton--wide" />
            <div className="attendance-page-panel__skeleton-grid">
              <div className="attendance-page-panel__skeleton" />
              <div className="attendance-page-panel__skeleton" />
              <div className="attendance-page-panel__skeleton" />
              <div className="attendance-page-panel__skeleton" />
            </div>
          </div>
        ) : detail ? (
          <div className="mt-4">
            <AttendancePersonDetailPanel
              detail={detail}
              perspective="review"
              roleLabel={roleLabel}
              activeLabel={roleLabel === "Manager" ? "Working" : "Active"}
              idleLabel={roleLabel === "Manager" ? "Away" : "Idle"}
            />
          </div>
        ) : null}
      </section>
    </FadeIn>
  );
}

