"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { AttendanceDayDetail } from "@/components/attendance/attendance-day-detail";
import { Alert } from "@/components/ui/alert";
import { useAttendanceLivePoll, isAttendanceToday } from "@/hooks/use-attendance-live-poll";
import type { AttendanceViewPerspective } from "@/lib/attendance/constants";
import type { AttendanceDetailResponse } from "@/lib/attendance/types";

type SelfAttendancePanelProps = {
  loadDetail: (date: string) => Promise<AttendanceDetailResponse>;
  perspective?: AttendanceViewPerspective;
  activeLabel?: string;
  idleLabel?: string;
  emptyMessage?: string;
  pollEnabled?: boolean;
};

export function SelfAttendancePanel({
  loadDetail,
  perspective = "self",
  activeLabel = "Active",
  idleLabel = "Idle",
  emptyMessage = "No sessions recorded for this date.",
  pollEnabled = true,
}: SelfAttendancePanelProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [detail, setDetail] = useState<AttendanceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError("");
      try {
        const response = await loadDetail(date);
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
    },
    [date, loadDetail],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useAttendanceLivePoll(pollEnabled && isAttendanceToday(date), () => {
    void load(true);
  });

  return (
    <div className="app-surface app-surface--elevated attendance-page-panel">
      <div className="attendance-page-panel__toolbar">
        <label className="attendance-date-field">
          <Clock3 className="size-4 text-primary" />
          <span>Date</span>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDate(event.target.value)}
            className="attendance-date-field__input"
          />
        </label>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {loading ? (
        <div className="attendance-page-panel__loading">
          <div className="attendance-page-panel__skeleton attendance-page-panel__skeleton--wide" />
          <div className="attendance-page-panel__skeleton-grid">
            <div className="attendance-page-panel__skeleton" />
            <div className="attendance-page-panel__skeleton" />
            <div className="attendance-page-panel__skeleton" />
            <div className="attendance-page-panel__skeleton" />
          </div>
          <div className="attendance-page-panel__skeleton attendance-page-panel__skeleton--tall" />
        </div>
      ) : detail ? (
        <AttendanceDayDetail
          detail={detail}
          perspective={perspective}
          emptyMessage={emptyMessage}
          activeLabel={activeLabel}
          idleLabel={idleLabel}
        />
      ) : null}
    </div>
  );
}
