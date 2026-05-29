import {
  LEAVE_DURATION_LABELS,
  LEAVE_TYPE_LABELS,
  formatLeaveDateRange,
} from "@/lib/leaves/constants";
import type { LeaveRequestRow } from "@/lib/leaves/types";
import type { AttendanceSummaryRow } from "@/lib/attendance/types";
import type { ManagerOverviewRow } from "@/lib/dashboard/types";

export function searchLeaveRow(row: LeaveRequestRow, query: string) {
  const haystack = [
    row.requester_name,
    row.requester_email,
    row.reason,
    row.status,
    row.leave_type,
    row.start_date,
    row.end_date,
    row.manager_name,
    row.assigned_reviewer_name,
    formatLeaveDateRange(row.start_date, row.end_date),
    LEAVE_TYPE_LABELS[row.leave_type],
    LEAVE_DURATION_LABELS[row.duration_type ?? "full_day"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function filterLeaveRow(row: LeaveRequestRow, filters: Record<string, string>) {
  if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
  if (filters.type && filters.type !== "all" && row.leave_type !== filters.type) return false;
  if (filters.duration && filters.duration !== "all" && (row.duration_type ?? "full_day") !== filters.duration) {
    return false;
  }
  return true;
}

export function searchAttendanceSummaryRow(row: AttendanceSummaryRow, query: string) {
  const haystack = [row.name, row.email, row.account_id, row.manager_name, row.live_status]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function filterAttendanceSummaryRow(row: AttendanceSummaryRow, filters: Record<string, string>) {
  if (filters.presence && filters.presence !== "all" && row.live_status !== filters.presence) return false;
  return true;
}

export function searchManagerOverviewRow(row: ManagerOverviewRow, query: string) {
  const haystack = [row.name, row.account_id, row.is_active ? "active" : "inactive"]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function filterManagerOverviewRow(row: ManagerOverviewRow, filters: Record<string, string>) {
  if (filters.status === "active" && !row.is_active) return false;
  if (filters.status === "inactive" && row.is_active) return false;
  return true;
}

export const LEAVE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

export const LEAVE_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  ...Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export const LEAVE_DURATION_FILTER_OPTIONS = [
  { value: "all", label: "All durations" },
  ...Object.entries(LEAVE_DURATION_LABELS).map(([value, label]) => ({ value, label })),
];

export const ATTENDANCE_PRESENCE_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "online", label: "Online" },
  { value: "idle", label: "Idle" },
  { value: "offline", label: "Offline" },
];
