export const ATTENDANCE_HEARTBEAT_SECONDS = 60;
export const ATTENDANCE_ONLINE_THRESHOLD_SECONDS = 120;
export const ATTENDANCE_STALE_SESSION_SECONDS = 300;
export const ATTENDANCE_IDLE_THRESHOLD_SECONDS = 300;
export const ATTENDANCE_DAILY_TARGET_HOURS = 9;
export const ATTENDANCE_DAILY_TARGET_MINUTES = ATTENDANCE_DAILY_TARGET_HOURS * 60;

export const ADMIN_ATTENDANCE_PATH = "/admin/dashboard/attendance";
export const MANAGER_ATTENDANCE_PATH = "/manager/dashboard/attendance";
export const AGENT_ATTENDANCE_PATH = "/agent/dashboard/attendance";

export const ATTENDANCE_EVENT_LABELS: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  heartbeat: "Heartbeat",
  idle_start: "Idle started",
  idle_end: "Idle ended",
  active: "Active again",
};

export const ATTENDANCE_STATUS_LABELS = {
  online: "Online",
  idle: "Idle",
  offline: "Offline",
} as const;

export type AttendanceStatusKey = keyof typeof ATTENDANCE_STATUS_LABELS;

export function formatAttendanceMinutes(minutes: number) {
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins} min`;
  return `${hours} hr ${mins} min`;
}

export function describeTeamLoggedInToday(count: number) {
  if (count === 0) return "No agents logged in yet";
  if (count === 1) return "1 agent checked in today";
  return `${count} agents checked in today`;
}

export function describeTeamOnlineNow(count: number) {
  if (count === 0) return "Nobody online right now";
  if (count === 1) return "1 agent is working now";
  return `${count} agents are working now`;
}

export function describeTeamIdleNow(count: number) {
  if (count === 0) return "Nobody idle right now";
  if (count === 1) return "1 agent is away from desk";
  return `${count} agents are away from desk`;
}

export function describeTeamActiveTime(minutes: number) {
  if (minutes <= 0) return "No active time recorded yet";
  return `${formatAttendanceMinutes(minutes)} total active time`;
}

export function describeLastLogout(value: string | null | undefined, liveStatus?: AttendanceStatusKey) {
  if (value) return `Last logout at ${formatAttendanceTime(value)}`;
  if (liveStatus === "online" || liveStatus === "idle") return "Still logged in";
  return "No logout recorded";
}

const ATTENDANCE_TIMELINE_EVENT_TYPES = new Set([
  "login",
  "logout",
  "idle_start",
  "idle_end",
  "active",
]);

export function getVisibleAttendanceEvents<T extends { event_type: string; created_at: string }>(events: T[]) {
  return events.filter((event) => ATTENDANCE_TIMELINE_EVENT_TYPES.has(event.event_type));
}

/** Keep one logout per minute — avoids duplicate rows from stale auto-close + manual sign-out. */
export function dedupeAttendanceTimelineEvents<T extends { id: number; event_type: string; created_at: string }>(
  events: T[],
) {
  const seen = new Set<string>();
  return events.filter((event) => {
    const minute = event.created_at.slice(0, 16);
    const key =
      event.event_type === "logout" ? `logout:${minute}` : `${event.event_type}:${event.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatAttendanceTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAttendanceDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function describeSessionDuration(loginAt: string, logoutAt: string | null, active: boolean) {
  const start = new Date(loginAt).getTime();
  const end = logoutAt ? new Date(logoutAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.floor((end - start) / 60_000));
  if (minutes <= 0) return active ? "Just started" : "Less than 1 min";
  return formatAttendanceMinutes(minutes);
}

export type DailyWorkTargetProgress = {
  targetMinutes: number;
  loggedMinutes: number;
  remainingMinutes: number;
  overtimeMinutes: number;
  percent: number;
  isComplete: boolean;
  headline: string;
  subline: string;
};

export type AttendanceViewPerspective = "self" | "review";

export function computeDailyWorkTarget(
  loggedMinutes: number,
  options?: {
    targetMinutes?: number;
    isToday?: boolean;
    isLoggedIn?: boolean;
    perspective?: AttendanceViewPerspective;
    subjectName?: string;
  },
): DailyWorkTargetProgress {
  const targetMinutes = options?.targetMinutes ?? ATTENDANCE_DAILY_TARGET_MINUTES;
  const isToday = options?.isToday ?? false;
  const isLoggedIn = options?.isLoggedIn ?? false;
  const perspective = options?.perspective ?? "self";
  const subjectName = options?.subjectName?.trim() || "Employee";
  const review = perspective === "review";
  const logged = Math.max(0, loggedMinutes);
  const isComplete = logged >= targetMinutes;
  const remainingMinutes = isComplete ? 0 : targetMinutes - logged;
  const overtimeMinutes = isComplete ? logged - targetMinutes : 0;
  const percent = Math.min(100, Math.round((logged / targetMinutes) * 100));

  let headline: string;
  let subline: string;

  if (isComplete && overtimeMinutes > 0) {
    headline = `${ATTENDANCE_DAILY_TARGET_HOURS}-hour target completed`;
    subline = review
      ? `${subjectName} logged ${formatAttendanceMinutes(overtimeMinutes)} beyond target`
      : `${formatAttendanceMinutes(overtimeMinutes)} extra logged today`;
  } else if (isComplete) {
    headline = `${ATTENDANCE_DAILY_TARGET_HOURS}-hour target completed`;
    subline = review
      ? `${subjectName} met the required ${ATTENDANCE_DAILY_TARGET_HOURS}-hour login time`
      : isToday
        ? "You have met today's required login time"
        : "Required login time was met on this date";
  } else if (isToday && isLoggedIn) {
    headline = `${formatAttendanceMinutes(remainingMinutes)} short of target`;
    subline = review
      ? `${subjectName} is logged in · needs ${formatAttendanceMinutes(remainingMinutes)} more to complete ${ATTENDANCE_DAILY_TARGET_HOURS} hr`
      : `Stay logged in for ${formatAttendanceMinutes(remainingMinutes)} more to complete your ${ATTENDANCE_DAILY_TARGET_HOURS}-hour target`;
  } else if (isToday) {
    headline = `${formatAttendanceMinutes(remainingMinutes)} remaining today`;
    subline = review
      ? `${subjectName} needs ${formatAttendanceMinutes(remainingMinutes)} more logged time to meet today's target`
      : `Log in and stay active for ${formatAttendanceMinutes(remainingMinutes)} more to complete your ${ATTENDANCE_DAILY_TARGET_HOURS}-hour target`;
  } else {
    headline = `${formatAttendanceMinutes(logged)} of ${ATTENDANCE_DAILY_TARGET_HOURS} hr`;
    subline = review
      ? `${subjectName} was ${formatAttendanceMinutes(remainingMinutes)} short of the daily target`
      : `${formatAttendanceMinutes(remainingMinutes)} short of the daily target on this date`;
  }

  return {
    targetMinutes,
    loggedMinutes: logged,
    remainingMinutes,
    overtimeMinutes,
    percent,
    isComplete,
    headline,
    subline,
  };
}

export function isAttendanceDateToday(date: string) {
  return date === new Date().toISOString().slice(0, 10);
}
