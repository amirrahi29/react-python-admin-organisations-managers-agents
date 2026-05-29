import type { AttendanceLiveStatus } from "@/lib/attendance/types";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/constants";
import { cn } from "@/lib/utils";

const toneClass: Record<AttendanceLiveStatus, string> = {
  online: "attendance-status--online",
  idle: "attendance-status--idle",
  offline: "attendance-status--offline",
};

export function AttendanceStatusBadge({
  status,
  className,
}: {
  status: AttendanceLiveStatus;
  className?: string;
}) {
  return (
    <span className={cn("attendance-status", toneClass[status], className)}>
      <span className="attendance-status__dot" aria-hidden />
      {ATTENDANCE_STATUS_LABELS[status]}
    </span>
  );
}
