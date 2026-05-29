"use client";

import { jsonRequest } from "@/lib/http/json-request";
import type {
  CreateOrganizationPayload,
  OrganizationRecord,
  PaginatedOrganizationsResponse,
  UpdateOrganizationPayload,
} from "@/lib/organizations/constants";

export async function listOrganizations(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "active" | "inactive";
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("page_size", String(params.pageSize));
  if (params?.search) query.set("search", params.search);
  if (params?.status === "active") query.set("status", "active");
  if (params?.status === "inactive") query.set("status", "inactive");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return jsonRequest<PaginatedOrganizationsResponse>(`/api/organizations${suffix}`);
}

export async function getOrganization(id: number) {
  return jsonRequest<{ item: OrganizationRecord }>(`/api/organizations/${id}`);
}

export async function createOrganization(payload: CreateOrganizationPayload) {
  return jsonRequest<{ item: OrganizationRecord; message?: string }>("/api/organizations", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    }),
  });
}

export async function updateOrganization(id: number, payload: UpdateOrganizationPayload) {
  return jsonRequest<{ item: OrganizationRecord }>(`/api/organizations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: payload.name.trim() }),
  });
}

export async function updateOrganizationStatus(id: number, isActive: boolean) {
  return jsonRequest<{ message: string; is_active: number }>(`/api/organizations/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function deleteOrganization(id: number) {
  return jsonRequest<{ message: string }>(`/api/organizations/${id}`, {
    method: "DELETE",
  });
}
