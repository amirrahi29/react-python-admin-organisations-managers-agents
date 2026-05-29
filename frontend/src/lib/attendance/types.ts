export type AttendanceLiveStatus = "online" | "idle" | "offline";

export type AttendanceEventRow = {
  id: number;
  event_type: string;
  created_at: string;
};

export type AttendanceSessionRow = {
  session_id: number;
  login_at: string;
  logout_at: string | null;
  last_seen_at: string | null;
  status: AttendanceLiveStatus;
  total_minutes: number;
  active_minutes: number;
  idle_minutes: number;
  events: AttendanceEventRow[];
};

export type AttendanceSummaryRow = {
  account_id: string;
  name: string;
  email: string;
  user_type: "manager" | "agent";
  user_id: number;
  live_status: AttendanceLiveStatus;
  first_login: string | null;
  last_logout: string | null;
  session_count: number;
  total_minutes: number;
  active_minutes: number;
  idle_minutes: number;
  manager_name?: string | null;
  is_active?: boolean;
};

export type AttendanceListResponse = {
  date: string;
  items: AttendanceSummaryRow[];
};

export type AttendanceDetailResponse = {
  date: string;
  user_type: "manager" | "agent";
  user_id: number;
  account_id?: string;
  name?: string;
  email?: string;
  manager_name?: string | null;
  live_status: AttendanceLiveStatus;
  first_login: string | null;
  last_logout: string | null;
  total_minutes: number;
  active_minutes: number;
  idle_minutes: number;
  sessions: AttendanceSessionRow[];
};

export type PresenceEvent = "heartbeat" | "idle_start" | "idle_end" | "active";
