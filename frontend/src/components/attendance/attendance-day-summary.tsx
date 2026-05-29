"use client";

import { Activity, Clock, LogIn, LogOut } from "lucide-react";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import {
  ATTENDANCE_STALE_SESSION_SECONDS,
  describeLastLogout,
  formatAttendanceMinutes,
  formatAttendanceTime,
} from "@/lib/attendance/constants";
import type { AttendanceDetailResponse } from "@/lib/attendance/types";

type AttendanceDaySummaryProps = {
  detail: AttendanceDetailResponse;
};

export function AttendanceDaySummary({ detail }: AttendanceDaySummaryProps) {
  const totalTracked = detail.total_minutes;
  const activeShare = totalTracked > 0 ? Math.round((detail.active_minutes / totalTracked) * 100) : 0;

  return (
    <div className="attendance-day-summary">
      <div className="attendance-day-summary__toolbar">
        <div>
          <p className="attendance-day-summary__eyebrow">Daily overview</p>
          <p className="attendance-day-summary__caption">
            {detail.sessions.length} session{detail.sessions.length === 1 ? "" : "s"} recorded
          </p>
        </div>
        <AttendanceStatusBadge status={detail.live_status} className="attendance-day-summary__status" />
      </div>

      <div className="attendance-day-summary__grid">
        <div className="attendance-metric-card">
          <span className="attendance-metric-card__icon attendance-metric-card__icon--login">
            <LogIn className="size-4" aria-hidden />
          </span>
          <div>
            <p className="attendance-metric-card__value">{formatAttendanceTime(detail.first_login)}</p>
            <p className="attendance-metric-card__label">First login</p>
          </div>
        </div>
        <div className="attendance-metric-card">
          <span className="attendance-metric-card__icon attendance-metric-card__icon--logout">
            <LogOut className="size-4" aria-hidden />
          </span>
          <div>
            <p className="attendance-metric-card__value">{formatAttendanceTime(detail.last_logout)}</p>
            <p className="attendance-metric-card__label">Last logout</p>
          </div>
        </div>
        <div className="attendance-metric-card">
          <span className="attendance-metric-card__icon attendance-metric-card__icon--active">
            <Activity className="size-4" aria-hidden />
          </span>
          <div>
            <p className="attendance-metric-card__value">{formatAttendanceMinutes(detail.active_minutes)}</p>
            <p className="attendance-metric-card__label">Active time</p>
          </div>
        </div>
        <div className="attendance-metric-card">
          <span className="attendance-metric-card__icon attendance-metric-card__icon--idle">
            <Clock className="size-4" aria-hidden />
          </span>
          <div>
            <p className="attendance-metric-card__value">{formatAttendanceMinutes(detail.idle_minutes)}</p>
            <p className="attendance-metric-card__label">Idle time</p>
          </div>
        </div>
      </div>

      <div className="attendance-day-summary__footer">
        <div className="attendance-utilization">
          <div className="attendance-utilization__head">
            <span>Utilization</span>
            <strong>{activeShare}% active</strong>
          </div>
          <div className="attendance-utilization__track" aria-hidden>
            <span
              className="attendance-utilization__fill attendance-utilization__fill--active"
              style={{ width: `${activeShare}%` }}
            />
            <span
              className="attendance-utilization__fill attendance-utilization__fill--idle"
              style={{ width: `${Math.max(0, 100 - activeShare)}%` }}
            />
          </div>
        </div>
        <p className="attendance-day-summary__note">
          {describeLastLogout(detail.last_logout, detail.live_status)}
          {" · "}
          Auto-close after {Math.floor(ATTENDANCE_STALE_SESSION_SECONDS / 60)} min inactivity
        </p>
      </div>
    </div>
  );
}
