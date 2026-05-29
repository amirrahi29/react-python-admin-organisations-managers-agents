"use client";

import { jsonRequest } from "@/lib/http/json-request";
import { createAgentTeamClient } from "@/lib/team/create-team-client";
import {
  buildTeamQuery,
  encodeAccountPath,
  type StatusActionResponse,
} from "@/lib/team/http";
import type {
  CreateAgentPayload,
  CreateManagerPayload,
  ListTeamParams,
  PaginatedTeamResponse,
  TeamMemberResponse,
  UpdateAgentPayload,
  UpdateManagerPayload,
} from "@/lib/team/constants";

const organizationAgentClient = createAgentTeamClient("/api/organization/agents");

export async function listOrganizationManagers(params?: ListTeamParams) {
  return jsonRequest<PaginatedTeamResponse>(`/api/organization/managers${buildTeamQuery(params)}`);
}

export async function listOrganizationAgents(params?: ListTeamParams) {
  return organizationAgentClient.list(params);
}

export type CreateOrganizationManagerPayload = Omit<CreateManagerPayload, "organizationId">;

export async function createOrganizationManager(payload: CreateOrganizationManagerPayload) {
  return jsonRequest<StatusActionResponse>("/api/organization/managers", {
    method: "POST",
    body: JSON.stringify({
      first_name: payload.firstName.trim(),
      last_name: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      phone: payload.phone.trim(),
      job_title: payload.jobTitle.trim(),
    }),
  });
}

export async function getOrganizationManager(accountId: string) {
  return jsonRequest<TeamMemberResponse>(
    `/api/organization/managers/${encodeAccountPath(accountId)}`,
  );
}

export async function updateOrganizationManager(
  accountId: string,
  payload: UpdateManagerPayload,
) {
  return jsonRequest<TeamMemberResponse>(
    `/api/organization/managers/${encodeAccountPath(accountId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        phone: payload.phone.trim(),
        job_title: payload.jobTitle.trim(),
      }),
    },
  );
}

export async function updateOrganizationManagerStatus(accountId: string, isActive: boolean) {
  return jsonRequest<StatusActionResponse>(
    `/api/organization/managers/${encodeAccountPath(accountId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    },
  );
}

export async function deleteOrganizationManager(accountId: string) {
  return jsonRequest<{ message: string; email_sent?: boolean }>(
    `/api/organization/managers/${encodeAccountPath(accountId)}`,
    { method: "DELETE" },
  );
}

export async function createOrganizationAgent(payload: CreateAgentPayload) {
  return organizationAgentClient.create(payload);
}

export async function getOrganizationAgent(accountId: string) {
  return organizationAgentClient.get(accountId);
}

export async function updateOrganizationAgent(accountId: string, payload: UpdateAgentPayload) {
  return organizationAgentClient.update(accountId, payload);
}

export async function updateOrganizationAgentStatus(accountId: string, isActive: boolean) {
  return organizationAgentClient.updateStatus(accountId, isActive);
}

export async function deleteOrganizationAgent(accountId: string) {
  return organizationAgentClient.remove(accountId);
}
