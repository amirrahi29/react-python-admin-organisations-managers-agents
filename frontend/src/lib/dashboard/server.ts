import { cache } from "react";
import { cookies } from "next/headers";
import { authHeader, getBackendUrl, ROLE_AUTH } from "@/lib/auth/constants";
import type {
  AdminDashboardStats,
  AgentDashboardStats,
  ManagerDashboardStats,
  OrganizationDashboardStats,
} from "@/lib/dashboard/types";

const STATS_REVALIDATE_SECONDS = 15;

async function fetchDashboardStats<T>(
  url: string,
  token: string,
): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: authHeader(token),
      next: { revalidate: STATS_REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const getAdminDashboardStatsServer = cache(async (): Promise<AdminDashboardStats | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ROLE_AUTH.admin.cookie)?.value;
  if (!token) return null;
  return fetchDashboardStats<AdminDashboardStats>(
    `${getBackendUrl()}/api/admin/dashboard/stats`,
    token,
  );
});

export const getManagerDashboardStatsServer = cache(async (): Promise<ManagerDashboardStats | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ROLE_AUTH.manager.cookie)?.value;
  if (!token) return null;
  return fetchDashboardStats<ManagerDashboardStats>(
    `${getBackendUrl()}/api/manager/dashboard/stats`,
    token,
  );
});

export const getAgentDashboardStatsServer = cache(async (): Promise<AgentDashboardStats | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ROLE_AUTH.agent.cookie)?.value;
  if (!token) return null;
  return fetchDashboardStats<AgentDashboardStats>(
    `${getBackendUrl()}/api/agent/dashboard/stats`,
    token,
  );
});

export const getOrganizationDashboardStatsServer = cache(async (): Promise<OrganizationDashboardStats | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ROLE_AUTH.organization.cookie)?.value;
  if (!token) return null;
  return fetchDashboardStats<OrganizationDashboardStats>(
    `${getBackendUrl()}/api/organization/dashboard/stats`,
    token,
  );
});
