"use client";

import { X } from "lucide-react";
import { AttendanceDayDetail } from "@/components/attendance/attendance-day-detail";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/ui/button";
import { ATTENDANCE_DAILY_TARGET_HOURS } from "@/lib/attendance/constants";
import type { AttendanceViewPerspective } from "@/lib/attendance/constants";
import type { AttendanceDetailResponse } from "@/lib/attendance/types";

type AttendancePersonDetailPanelProps = {
  detail: AttendanceDetailResponse;
  perspective?: AttendanceViewPerspective;
  roleLabel?: string;
  activeLabel?: string;
  idleLabel?: string;
  emptyMessage?: string;
  onClose?: () => void;
};

export function AttendancePersonDetailPanel({
  detail,
  perspective = "review",
  roleLabel = "Employee",
  activeLabel = "Active",
  idleLabel = "Idle",
  emptyMessage,
  onClose,
}: AttendancePersonDetailPanelProps) {
  const subjectName = detail.name ?? roleLabel;

  return (
    <section className="attendance-person-detail">
      <div className="attendance-person-detail__head">
        <div>
          <p className="attendance-person-detail__eyebrow">{roleLabel} performance · {detail.date}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{subjectName}</h2>
              {detail.email ? <p className="text-sm text-muted-foreground">{detail.email}</p> : null}
            </div>
            <AttendanceStatusBadge status={detail.live_status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Full login/logout timeline, {ATTENDANCE_DAILY_TARGET_HOURS}-hour target progress, and session activity logs.
          </p>
        </div>
        {onClose ? (
          <Button type="button" variant="secondary" className="h-9 gap-1.5 px-3" onClick={onClose}>
            <X className="size-4" />
            Close
          </Button>
        ) : null}
      </div>

      <AttendanceDayDetail
        detail={detail}
        perspective={perspective}
        subjectName={subjectName}
        emptyMessage={emptyMessage ?? `No sessions recorded for ${subjectName} on this date.`}
        activeLabel={activeLabel}
        idleLabel={idleLabel}
      />
    </section>
  );
}
