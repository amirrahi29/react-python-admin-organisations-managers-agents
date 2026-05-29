import type { LeaveStatus } from "@/lib/leaves/types";
import { LEAVE_STATUS_LABELS } from "@/lib/leaves/constants";
import { cn } from "@/lib/utils";

const toneClass: Record<LeaveStatus, string> = {
  pending: "leave-status--pending",
  approved: "leave-status--approved",
  declined: "leave-status--declined",
};

export function LeaveStatusBadge({
  status,
  className,
}: {
  status: LeaveStatus;
  className?: string;
}) {
  return (
    <span className={cn("leave-status", toneClass[status], className)}>
      {LEAVE_STATUS_LABELS[status]}
    </span>
  );
}
