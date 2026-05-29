export type LeaveStatus = "pending" | "approved" | "declined";

export type LeaveType = "casual" | "sick" | "annual" | "unpaid" | "other";

export type LeaveDurationType = "full_day" | "half_day";

export type LeaveRequestRow = {
  id: number;
  requester_type: "manager" | "agent";
  requester_id: number;
  requester_name?: string | null;
  requester_email?: string | null;
  requester_account_id?: string | null;
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  duration_type: LeaveDurationType;
  reason: string;
  status: LeaveStatus;
  calendar_days: number;
  working_days: number;
  weekend_days: number;
  weekend_dates: string[];
  reviewed_by_type?: string | null;
  reviewed_by_id?: number | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  manager_name?: string | null;
  assigned_reviewer_type?: string | null;
  assigned_reviewer_id?: number | null;
  assigned_reviewer_name?: string | null;
  can_edit?: boolean;
  can_delete?: boolean;
};

export type LeaveListResponse = {
  items: LeaveRequestRow[];
};

export type LeaveSummary = {
  total: number;
  pending: number;
  approved: number;
  declined: number;
  approved_working_days: number;
};

export type LeaveHistoryResponse = {
  month: string | null;
  summary: LeaveSummary;
  items: LeaveRequestRow[];
};

export type LeavePreviewResponse = {
  calendar_days: number;
  working_days: number;
  weekend_days: number;
  weekend_dates: string[];
  duration_type?: LeaveDurationType;
};

export type LeavePayload = {
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  duration_type: LeaveDurationType;
  reason: string;
};

export type LeaveRoutingResponse = {
  approver_type: "manager" | "admin";
  approver_id: number;
  approver_name: string;
  approver_email?: string | null;
};
