import type { AuthRole } from "@/lib/auth/constants";
import type {
  LeaveDurationType,
  LeaveHistoryResponse,
  LeaveListResponse,
  LeavePayload,
  LeavePreviewResponse,
  LeaveRequestRow,
  LeaveRoutingResponse,
} from "@/lib/leaves/types";

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
    throw new Error(typeof message === "string" ? message : "Request failed");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function previewLeaveDays(
  role: Exclude<AuthRole, "admin">,
  startDate: string,
  endDate: string,
  durationType: LeaveDurationType = "full_day",
) {
  const params = new URLSearchParams({
    role,
    start_date: startDate,
    end_date: endDate,
    duration_type: durationType,
  });
  return request<LeavePreviewResponse>(`/api/leaves/preview?${params.toString()}`);
}

export function getAgentLeaves() {
  return request<LeaveListResponse>("/api/agent/leaves");
}

export function getAgentLeaveRouting() {
  return request<LeaveRoutingResponse>("/api/agent/leaves/routing");
}

export function createAgentLeave(payload: LeavePayload) {
  return request<LeaveRequestRow>("/api/agent/leaves", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAgentLeave(id: number, payload: LeavePayload) {
  return request<LeaveRequestRow>(`/api/agent/leaves/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAgentLeave(id: number) {
  return request<{ message: string }>(`/api/agent/leaves/${id}`, { method: "DELETE" });
}

export function getManagerLeaves() {
  return request<LeaveListResponse>("/api/manager/leaves");
}

export function getManagerLeaveRouting() {
  return request<LeaveRoutingResponse>("/api/manager/leaves/routing");
}

export function createManagerLeave(payload: LeavePayload) {
  return request<LeaveRequestRow>("/api/manager/leaves", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateManagerLeave(id: number, payload: LeavePayload) {
  return request<LeaveRequestRow>(`/api/manager/leaves/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteManagerLeave(id: number) {
  return request<{ message: string }>(`/api/manager/leaves/${id}`, { method: "DELETE" });
}

function withMonth(path: string, month?: string) {
  if (!month) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}month=${encodeURIComponent(month)}`;
}

export function getManagerAgentLeaveHistory(month?: string) {
  return request<LeaveHistoryResponse>(withMonth("/api/manager/leaves/agents", month));
}

export function approveAgentLeave(id: number, reviewNote?: string) {
  return request<LeaveRequestRow>(`/api/manager/leaves/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ review_note: reviewNote ?? null }),
  });
}

export function declineAgentLeave(id: number, reviewNote?: string) {
  return request<LeaveRequestRow>(`/api/manager/leaves/${id}/decline`, {
    method: "POST",
    body: JSON.stringify({ review_note: reviewNote ?? null }),
  });
}

export function getManagerPendingLeaves() {
  return request<LeaveListResponse>("/api/manager/leaves/pending");
}

export function getAdminManagerLeaveHistory(month?: string) {
  return request<LeaveHistoryResponse>(withMonth("/api/admin/leaves/managers", month));
}

export function getAdminPendingLeaves() {
  return request<LeaveListResponse>("/api/admin/leaves/pending");
}

export function getAdminAgentLeaves(month?: string) {
  return request<LeaveHistoryResponse>(withMonth("/api/admin/leaves/agents", month));
}

export function approveManagerLeave(id: number, reviewNote?: string) {
  return request<LeaveRequestRow>(`/api/admin/leaves/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ review_note: reviewNote ?? null }),
  });
}

export function declineManagerLeave(id: number, reviewNote?: string) {
  return request<LeaveRequestRow>(`/api/admin/leaves/${id}/decline`, {
    method: "POST",
    body: JSON.stringify({ review_note: reviewNote ?? null }),
  });
}
