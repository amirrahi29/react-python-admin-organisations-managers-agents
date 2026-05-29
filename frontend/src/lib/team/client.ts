"use client";

import { jsonRequest } from "@/lib/http/json-request";
import {
  buildTeamQuery,
  encodeAccountPath,
  type StatusActionResponse,
} from "@/lib/team/http";
import { createAgentTeamClient } from "@/lib/team/create-team-client";
import type {
  CreateAgentPayload,
  CreateManagerPayload,
  ListTeamParams,
  PaginatedTeamResponse,
  TeamMemberResponse,
  UpdateAgentPayload,
  UpdateManagerPayload,
} from "@/lib/team/constants";

const agentClient = createAgentTeamClient("/api/agents");

export async function listManagers(params?: ListTeamParams) {
  return jsonRequest<PaginatedTeamResponse>(`/api/managers${buildTeamQuery(params)}`);
}

export async function createManager(payload: CreateManagerPayload) {
  return jsonRequest<StatusActionResponse>("/api/managers", {
    method: "POST",
    body: JSON.stringify({
      first_name: payload.firstName.trim(),
      last_name: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      phone: payload.phone.trim(),
      job_title: payload.jobTitle.trim(),
      organization_id: payload.organizationId,
    }),
  });
}

export async function getManager(accountId: string) {
  return jsonRequest<TeamMemberResponse>(`/api/managers/${encodeAccountPath(accountId)}`);
}

export async function updateManager(accountId: string, payload: UpdateManagerPayload) {
  return jsonRequest<TeamMemberResponse>(`/api/managers/${encodeAccountPath(accountId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      first_name: payload.firstName.trim(),
      last_name: payload.lastName.trim(),
      phone: payload.phone.trim(),
      job_title: payload.jobTitle.trim(),
    }),
  });
}

export async function updateManagerStatus(accountId: string, isActive: boolean) {
  return jsonRequest<StatusActionResponse>(
    `/api/managers/${encodeAccountPath(accountId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    }
  );
}

export async function deleteManager(accountId: string) {
  return jsonRequest<{ message: string; email_sent?: boolean }>(
    `/api/managers/${encodeAccountPath(accountId)}`,
    { method: "DELETE" }
  );
}

export async function listAgents(params?: ListTeamParams) {
  return agentClient.list(params);
}

export async function createAgent(payload: CreateAgentPayload) {
  return agentClient.create(payload);
}

export async function getAgent(accountId: string) {
  return agentClient.get(accountId);
}

export async function updateAgent(accountId: string, payload: UpdateAgentPayload) {
  return agentClient.update(accountId, payload);
}

export async function updateAgentStatus(accountId: string, isActive: boolean) {
  return agentClient.updateStatus(accountId, isActive);
}

export async function deleteAgent(accountId: string) {
  return agentClient.remove(accountId);
}
