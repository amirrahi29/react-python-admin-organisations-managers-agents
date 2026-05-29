import type {
  AttendanceDetailResponse,
  AttendanceListResponse,
  PresenceEvent,
} from "@/lib/attendance/types";
import type { AuthRole } from "@/lib/auth/constants";

const ATTENDANCE_LIST_CACHE_TTL_MS = 15_000;

type AttendanceListCacheEntry = {
  expiresAt: number;
  data: AttendanceListResponse;
};

const attendanceListCache = new Map<string, AttendanceListCacheEntry>();
const attendanceListInflight = new Map<string, Promise<AttendanceListResponse>>();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = (await response.json()) as { error?: string; detail?: string };
      message = data.error ?? data.detail ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function withDate(path: string, date?: string) {
  if (!date) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}date=${encodeURIComponent(date)}`;
}

function cachedAttendanceList(key: string, fetcher: () => Promise<AttendanceListResponse>) {
  const cached = attendanceListCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data);
  }

  const inFlight = attendanceListInflight.get(key);
  if (inFlight) return inFlight;

  const promise = fetcher()
    .then((data) => {
      attendanceListCache.set(key, {
        data,
        expiresAt: Date.now() + ATTENDANCE_LIST_CACHE_TTL_MS,
      });
      return data;
    })
    .finally(() => {
      attendanceListInflight.delete(key);
    });

  attendanceListInflight.set(key, promise);
  return promise;
}

export function sendPresence(role: Exclude<AuthRole, "admin">, event: PresenceEvent) {
  return request<{ session_id: number; status: string; reopened?: boolean }>(
    `/api/attendance/presence?role=${encodeURIComponent(role)}`,
    {
      method: "POST",
      body: JSON.stringify({ event }),
    },
  );
}

export function sendAttendanceLogout(role: Exclude<AuthRole, "admin">) {
  const url = `/api/attendance/logout?role=${encodeURIComponent(role)}`;

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(url, new Blob([], { type: "application/octet-stream" }));
  }

  return fetch(url, {
    method: "POST",
    credentials: "include",
    keepalive: true,
  }).catch(() => undefined);
}

export function getAgentAttendance(date?: string) {
  return request<AttendanceDetailResponse>(withDate("/api/agent/attendance", date));
}

export function getManagerTeamAttendance(date?: string) {
  const path = withDate("/api/manager/attendance", date);
  return cachedAttendanceList(path, () => request<AttendanceListResponse>(path));
}

export function getManagerAgentAttendance(accountId: string, date?: string) {
  return request<AttendanceDetailResponse>(
    withDate(`/api/manager/attendance/agents/${encodeURIComponent(accountId)}`, date),
  );
}

export function getManagerSelfAttendance(date?: string) {
  return request<AttendanceDetailResponse>(withDate("/api/manager/attendance/me", date));
}

export function getAdminManagerAttendance(date?: string) {
  const base = "/api/admin/attendance?scope=managers";
  const path = date ? `${base}&date=${encodeURIComponent(date)}` : base;
  return cachedAttendanceList(path, () => request<AttendanceListResponse>(path));
}

export function getAdminAgentAttendance(date?: string) {
  const base = "/api/admin/attendance?scope=agents";
  const path = date ? `${base}&date=${encodeURIComponent(date)}` : base;
  return cachedAttendanceList(path, () => request<AttendanceListResponse>(path));
}

export function getAdminManagerAttendanceDetail(accountId: string, date?: string) {
  const base = `/api/admin/attendance/${encodeURIComponent(accountId)}?scope=managers`;
  return request<AttendanceDetailResponse>(date ? `${base}&date=${encodeURIComponent(date)}` : base);
}

export function getAdminAgentAttendanceDetail(accountId: string, date?: string) {
  const base = `/api/admin/attendance/${encodeURIComponent(accountId)}?scope=agents`;
  return request<AttendanceDetailResponse>(date ? `${base}&date=${encodeURIComponent(date)}` : base);
}
