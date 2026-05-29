"use client";

import {
  AuthError,
  ROLE_AUTH,
  type AdminInfo,
  type AgentInfo,
  type AuthRole,
  type LoginPayload,
  type ManagerInfo,
  type OrganizationInfo,
  type RegisterPayload,
  type UpdateProfilePayload,
} from "@/lib/auth/constants";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = (await response.json()) as { error?: string; detail?: string };
      message = data.error ?? data.detail ?? message;
    } catch {
      // ignore
    }
    throw new AuthError(message, response.status);
  }

  return response.json() as Promise<T>;
}

function loginBody(payload: LoginPayload) {
  return JSON.stringify({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  });
}

function profileBody(payload: UpdateProfilePayload) {
  return JSON.stringify({
    name: payload.name.trim(),
    phone: payload.phone?.trim() || null,
    job_title: payload.jobTitle?.trim() || null,
  });
}

export async function login(payload: LoginPayload) {
  return request<{ admin: AdminInfo }>(ROLE_AUTH.admin.loginApiPath, {
    method: "POST",
    body: loginBody(payload),
  });
}

export async function register(payload: RegisterPayload) {
  return request<{ admin: AdminInfo }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      name: payload.name.trim(),
      password: payload.password,
      confirm_password: payload.confirmPassword,
    }),
  });
}

export async function logout() {
  return request<{ message: string }>(ROLE_AUTH.admin.logoutApiPath, {
    method: "POST",
  });
}

export async function getCurrentAdmin() {
  return request<{ admin: AdminInfo }>(ROLE_AUTH.admin.meApiPath);
}

export async function updateProfile(payload: UpdateProfilePayload) {
  return request<{ admin: AdminInfo; message: string }>(ROLE_AUTH.admin.profileApiPath, {
    method: "PATCH",
    body: profileBody(payload),
  });
}

export async function loginAsRole(role: Exclude<AuthRole, "admin">, payload: LoginPayload) {
  const config = ROLE_AUTH[role];
  return request<{ manager?: ManagerInfo; agent?: AgentInfo; organization?: OrganizationInfo }>(
    config.loginApiPath,
    {
      method: "POST",
      body: loginBody(payload),
    },
  );
}

export async function logoutRole(role: AuthRole) {
  return request<{ message: string }>(ROLE_AUTH[role].logoutApiPath, {
    method: "POST",
  });
}

export async function updateManagerProfile(payload: UpdateProfilePayload) {
  return request<{ manager: ManagerInfo; message: string }>(ROLE_AUTH.manager.profileApiPath, {
    method: "PATCH",
    body: profileBody(payload),
  });
}

export async function updateAgentProfile(payload: UpdateProfilePayload) {
  return request<{ agent: AgentInfo; message: string }>(ROLE_AUTH.agent.profileApiPath, {
    method: "PATCH",
    body: profileBody(payload),
  });
}

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const CHANGE_PASSWORD_PATHS: Record<AuthRole, string> = {
  admin: "/api/auth/change-password",
  organization: "/api/auth/organization/change-password",
  manager: "/api/auth/manager/change-password",
  agent: "/api/auth/agent/change-password",
};

export async function changePassword(role: AuthRole, payload: ChangePasswordPayload) {
  return request<{ message: string }>(CHANGE_PASSWORD_PATHS[role], {
    method: "POST",
    body: JSON.stringify({
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
      confirm_password: payload.confirmPassword,
    }),
  });
}

export async function updateOrganizationProfile(payload: Pick<UpdateProfilePayload, "name">) {
  return request<{ organization: OrganizationInfo; message: string }>(
    ROLE_AUTH.organization.profileApiPath,
    {
      method: "PATCH",
      body: JSON.stringify({ name: payload.name.trim() }),
    },
  );
}

export async function loginOrganization(payload: LoginPayload) {
  const data = await request<{ organization?: OrganizationInfo }>(ROLE_AUTH.organization.loginApiPath, {
    method: "POST",
    body: loginBody(payload),
  });
  if (!data.organization) throw new AuthError("Invalid login response", 500);
  return { organization: data.organization };
}

export async function loginManager(payload: LoginPayload) {
  const data = await loginAsRole("manager", payload);
  if (!data.manager) throw new AuthError("Invalid login response", 500);
  return { manager: data.manager };
}

export async function loginAgent(payload: LoginPayload) {
  const data = await request<{ agent?: AgentInfo }>(ROLE_AUTH.agent.loginApiPath, {
    method: "POST",
    body: loginBody(payload),
  });
  if (!data.agent) throw new AuthError("Invalid login response", 500);
  return { agent: data.agent };
}
