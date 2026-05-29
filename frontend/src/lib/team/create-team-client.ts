"use client";

import { jsonRequest } from "@/lib/http/json-request";
import {
  buildTeamQuery,
  encodeAccountPath,
  type StatusActionResponse,
} from "@/lib/team/http";
import type {
  CreateManagerAgentPayload,
  ListTeamParams,
  PaginatedTeamResponse,
  TeamMemberResponse,
  UpdateManagerAgentPayload,
} from "@/lib/team/constants";

type AgentCreateBody = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  jobTitle: string;
  managerAccountId?: string;
};

type AgentUpdateBody = {
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  managerAccountId?: string;
};

function agentCreatePayload(payload: AgentCreateBody) {
  const body: Record<string, string> = {
    first_name: payload.firstName.trim(),
    last_name: payload.lastName.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    phone: payload.phone.trim(),
    job_title: payload.jobTitle.trim(),
  };
  if (payload.managerAccountId) {
    body.manager_account_id = payload.managerAccountId;
  }
  return body;
}

function agentUpdatePayload(payload: AgentUpdateBody) {
  const body: Record<string, string> = {
    first_name: payload.firstName.trim(),
    last_name: payload.lastName.trim(),
    phone: payload.phone.trim(),
    job_title: payload.jobTitle.trim(),
  };
  if (payload.managerAccountId) {
    body.manager_account_id = payload.managerAccountId;
  }
  return body;
}

export function createAgentTeamClient(basePath: string) {
  return {
    list(params?: ListTeamParams) {
      return jsonRequest<PaginatedTeamResponse>(`${basePath}${buildTeamQuery(params)}`);
    },
    create(payload: AgentCreateBody) {
      return jsonRequest<StatusActionResponse>(basePath, {
        method: "POST",
        body: JSON.stringify(agentCreatePayload(payload)),
      });
    },
    get(accountId: string) {
      return jsonRequest<TeamMemberResponse>(`${basePath}/${encodeAccountPath(accountId)}`);
    },
    update(accountId: string, payload: AgentUpdateBody) {
      return jsonRequest<TeamMemberResponse>(`${basePath}/${encodeAccountPath(accountId)}`, {
        method: "PATCH",
        body: JSON.stringify(agentUpdatePayload(payload)),
      });
    },
    updateStatus(accountId: string, isActive: boolean) {
      return jsonRequest<StatusActionResponse>(`${basePath}/${encodeAccountPath(accountId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive }),
      });
    },
    remove(accountId: string) {
      return jsonRequest<{ message: string; email_sent?: boolean }>(
        `${basePath}/${encodeAccountPath(accountId)}`,
        { method: "DELETE" },
      );
    },
  };
}

export type AgentTeamClient = ReturnType<typeof createAgentTeamClient>;

export type { CreateManagerAgentPayload, UpdateManagerAgentPayload };
