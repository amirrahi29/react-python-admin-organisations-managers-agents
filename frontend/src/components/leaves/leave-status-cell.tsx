"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { LeaveStatusBadge } from "@/components/leaves/leave-status-badge";
import { formatReviewedAt } from "@/lib/leaves/constants";
import type { LeaveStatus } from "@/lib/leaves/types";
import { cn } from "@/lib/utils";

type LeaveStatusCellProps = {
  status: LeaveStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewerName?: string | null;
  showReviewedTime?: boolean;
  variant?: "default" | "compact";
  className?: string;
};

const noteTone: Record<Exclude<LeaveStatus, "pending">, string> = {
  approved: "leave-review-note--approved",
  declined: "leave-review-note--declined",
};

const noteLabel: Record<Exclude<LeaveStatus, "pending">, string> = {
  approved: "Approval note",
  declined: "Decline reason",
};

const noteIcon: Record<Exclude<LeaveStatus, "pending">, typeof CheckCircle2> = {
  approved: CheckCircle2,
  declined: XCircle,
};

export function LeaveStatusCell({
  status,
  reviewNote,
  reviewedAt,
  reviewerName,
  showReviewedTime = true,
  variant = "default",
  className,
}: LeaveStatusCellProps) {
  const trimmedNote = reviewNote?.trim();
  const showNote = Boolean(trimmedNote) && status !== "pending";
  const NoteIcon = status !== "pending" ? noteIcon[status] : CheckCircle2;

  return (
    <div className={cn("leave-status-cell", variant === "compact" && "leave-status-cell--compact", className)}>
      <LeaveStatusBadge status={status} />

      {status === "pending" && variant === "default" ? (
        <p className="leave-status-cell__hint">
          <Clock3 className="size-3.5 shrink-0" aria-hidden />
          Waiting for reviewer decision
        </p>
      ) : null}

      {showNote ? (
        <div className={cn("leave-review-note", variant === "compact" && "leave-review-note--compact", noteTone[status])}>
          {variant === "compact" ? (
            <>
              <p className="leave-review-note__label">{noteLabel[status]}</p>
              <p className="leave-review-note__message">{trimmedNote}</p>
            </>
          ) : (
            <>
              <div className="leave-review-note__head">
                <NoteIcon className="size-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="leave-review-note__label">{noteLabel[status]}</p>
                  {reviewerName ? (
                    <p className="leave-review-note__meta">From {reviewerName}</p>
                  ) : null}
                </div>
              </div>
              <p className="leave-review-note__message">{trimmedNote}</p>
              {showReviewedTime && reviewedAt ? (
                <p className="leave-review-note__time">Reviewed {formatReviewedAt(reviewedAt)}</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
