"use client";

import type { CSSProperties } from "react";
import { CheckCircle2, Target, Timer } from "lucide-react";
import {
  ATTENDANCE_DAILY_TARGET_HOURS,
  computeDailyWorkTarget,
  formatAttendanceMinutes,
  isAttendanceDateToday,
} from "@/lib/attendance/constants";
import type { AttendanceDetailResponse, AttendanceLiveStatus } from "@/lib/attendance/types";
import type { AttendanceViewPerspective } from "@/lib/attendance/constants";
import { cn } from "@/lib/utils";

type AttendanceWorkTargetCardProps = {
  detail: AttendanceDetailResponse;
  perspective?: AttendanceViewPerspective;
  subjectName?: string;
};

function isLoggedInStatus(status: AttendanceLiveStatus) {
  return status === "online" || status === "idle";
}

export function AttendanceWorkTargetCard({
  detail,
  perspective = "self",
  subjectName,
}: AttendanceWorkTargetCardProps) {
  const isToday = isAttendanceDateToday(detail.date);
  const isLoggedIn = isLoggedInStatus(detail.live_status);
  const name = subjectName ?? detail.name ?? "Employee";
  const progress = computeDailyWorkTarget(detail.total_minutes, {
    isToday,
    isLoggedIn,
    perspective,
    subjectName: name,
  });
  const review = perspective === "review";

  return (
    <div
      className={cn(
        "attendance-work-target",
        progress.isComplete && "attendance-work-target--complete",
        isToday && isLoggedIn && !progress.isComplete && "attendance-work-target--active",
      )}
    >
      <div className="attendance-work-target__head">
        <div className="attendance-work-target__icon-wrap">
          {progress.isComplete ? (
            <CheckCircle2 className="size-5" aria-hidden />
          ) : (
            <Target className="size-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="attendance-work-target__eyebrow">
            {review ? `${name} · ${ATTENDANCE_DAILY_TARGET_HOURS}-hour target` : `Daily ${ATTENDANCE_DAILY_TARGET_HOURS}-hour target`}
          </p>
          <h3 className="attendance-work-target__headline">{progress.headline}</h3>
          <p className="attendance-work-target__subline">{progress.subline}</p>
        </div>
        <div className="attendance-work-target__ring" style={{ "--progress": `${progress.percent}%` } as CSSProperties}>
          <span>{progress.percent}%</span>
        </div>
      </div>

      <div
        className="attendance-work-target__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-label={`${ATTENDANCE_DAILY_TARGET_HOURS}-hour daily target progress`}
      >
        <span className="attendance-work-target__fill" style={{ width: `${progress.percent}%` }} />
      </div>

      <div className="attendance-work-target__stats">
        <div>
          <p className="attendance-work-target__stat-value">{formatAttendanceMinutes(progress.loggedMinutes)}</p>
          <p className="attendance-work-target__stat-label">{review ? "Logged time" : "Logged today"}</p>
        </div>
        <div>
          <p className="attendance-work-target__stat-value">
            {progress.isComplete ? "Done" : formatAttendanceMinutes(progress.remainingMinutes)}
          </p>
          <p className="attendance-work-target__stat-label">
            {progress.isComplete ? "Target met" : "Still needed"}
          </p>
        </div>
        <div>
          <p className="attendance-work-target__stat-value">{ATTENDANCE_DAILY_TARGET_HOURS} hr</p>
          <p className="attendance-work-target__stat-label">Daily goal</p>
        </div>
        {isToday && isLoggedIn && !progress.isComplete ? (
          <div className="attendance-work-target__live">
            <Timer className="size-3.5 shrink-0" aria-hidden />
            <span>
              {review ? `Live · updates while ${name} is logged in` : "Live · updates while you are logged in"}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
