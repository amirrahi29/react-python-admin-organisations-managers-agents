import type { LeaveDurationType, LeaveStatus, LeaveType } from "@/lib/leaves/types";

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: "Casual",
  sick: "Sick",
  annual: "Annual",
  unpaid: "Unpaid",
  other: "Other",
};

export const LEAVE_DURATION_LABELS: Record<LeaveDurationType, string> = {
  full_day: "Full day",
  half_day: "Half day",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
};

export function minLeaveStartDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function isLeaveDateAllowed(value: string) {
  if (!value) return false;
  return value >= minLeaveStartDate();
}

export function currentLeaveMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatLeaveMonthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return month;
  return new Date(year, mon - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatReviewedAt(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWorkingDays(workingDays: number, durationType?: LeaveDurationType) {
  if (durationType === "half_day" || workingDays === 0.5) return "Half day";
  if (Number.isInteger(workingDays)) return `${workingDays} day${workingDays === 1 ? "" : "s"}`;
  return `${workingDays} days`;
}

export function formatLeaveDateRange(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (start === end) return startDate.toLocaleDateString(undefined, opts);
  return `${startDate.toLocaleDateString(undefined, opts)} – ${endDate.toLocaleDateString(undefined, opts)}`;
}

export function formatWeekendNote(weekendDates: string[]) {
  if (!weekendDates.length) return null;
  const labels = weekendDates.map((value) => {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  });
  return `Weekends excluded (${labels.join(", ")}): Sat–Sun are not counted as leave days.`;
}
