"use client";

import {
  ATTENDANCE_DAILY_TARGET_HOURS,
  ATTENDANCE_DAILY_TARGET_MINUTES,
  formatAttendanceMinutes,
} from "@/lib/attendance/constants";
import { cn } from "@/lib/utils";

type AttendanceTargetCellProps = {
  totalMinutes: number;
  className?: string;
};

export function AttendanceTargetCell({ totalMinutes, className }: AttendanceTargetCellProps) {
  const logged = Math.max(0, totalMinutes);
  const percent = Math.min(100, Math.round((logged / ATTENDANCE_DAILY_TARGET_MINUTES) * 100));
  const isComplete = logged >= ATTENDANCE_DAILY_TARGET_MINUTES;
  const remaining = isComplete ? 0 : ATTENDANCE_DAILY_TARGET_MINUTES - logged;

  return (
    <div className={cn("attendance-target-cell", className)}>
      <div className="attendance-target-cell__head">
        <span className={cn("attendance-target-cell__value", isComplete && "attendance-target-cell__value--complete")}>
          {percent}%
        </span>
        <span className="attendance-target-cell__goal">{ATTENDANCE_DAILY_TARGET_HOURS} hr</span>
      </div>
      <div className="attendance-target-cell__track" aria-hidden>
        <span
          className={cn("attendance-target-cell__fill", isComplete && "attendance-target-cell__fill--complete")}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="attendance-target-cell__meta">
        {isComplete
          ? "Target met"
          : `${formatAttendanceMinutes(remaining)} left`}
      </p>
    </div>
  );
}
