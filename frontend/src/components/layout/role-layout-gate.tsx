import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { RoleDashboardShell } from "@/components/layout/role-dashboard-shell";
import {
  AGENT_JWT_COOKIE,
  AGENT_LOGIN_PATH,
  ADMIN_LOGIN_PATH,
  JWT_COOKIE,
  MANAGER_JWT_COOKIE,
  MANAGER_LOGIN_PATH,
  ORGANIZATION_JWT_COOKIE,
  ORGANIZATION_LOGIN_PATH,
} from "@/lib/auth/constants";
import {
  getAgentHierarchyChain,
  getManagerHierarchyChain,
  getOrganizationHierarchyChain,
} from "@/lib/auth/hierarchy";
import {
  getSessionAgent,
  getSessionManager,
  getSessionOrganization,
  getSessionAdmin,
  staleSessionClearPath,
} from "@/lib/auth/server";

export async function AdminLayoutGate({ children }: { children: ReactNode }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    const cookieStore = await cookies();
    if (cookieStore.get(JWT_COOKIE)?.value) {
      redirect(staleSessionClearPath("admin", ADMIN_LOGIN_PATH));
    }
    redirect(ADMIN_LOGIN_PATH);
  }

  return (
    <RoleDashboardShell
      role="admin"
      displayName={admin.name}
      displayEmail={admin.email}
    >
      {children}
    </RoleDashboardShell>
  );
}

export async function OrganizationLayoutGate({ children }: { children: ReactNode }) {
  const organization = await getSessionOrganization();
  if (!organization) {
    const cookieStore = await cookies();
    if (cookieStore.get(ORGANIZATION_JWT_COOKIE)?.value) {
      redirect(staleSessionClearPath("organization", ORGANIZATION_LOGIN_PATH));
    }
    redirect(ORGANIZATION_LOGIN_PATH);
  }

  return (
    <RoleDashboardShell
      role="organization"
      displayName={organization.name}
      displayEmail={organization.email}
      hierarchy={getOrganizationHierarchyChain(organization)}
    >
      {children}
    </RoleDashboardShell>
  );
}

/**
 * Server gate used by Manager-scoped layouts (dashboard, profile, …). Redirects
 * unauthenticated visitors to the manager login and renders the shared role
 * shell on success. Used by every Manager `layout.tsx` to remove boilerplate.
 */
export async function ManagerLayoutGate({ children }: { children: ReactNode }) {
  const manager = await getSessionManager();
  if (!manager) {
    const cookieStore = await cookies();
    if (cookieStore.get(MANAGER_JWT_COOKIE)?.value) {
      redirect(staleSessionClearPath("manager", MANAGER_LOGIN_PATH));
    }
    redirect(MANAGER_LOGIN_PATH);
  }

  return (
    <RoleDashboardShell
      role="manager"
      displayName={manager.name}
      displayEmail={manager.email}
      accountId={manager.account_id}
      hierarchy={getManagerHierarchyChain(manager)}
    >
      {children}
    </RoleDashboardShell>
  );
}

/**
 * Server gate used by Agent-scoped layouts. Redirects unauthenticated visitors
 * to the agent login and renders the shared role shell.
 */
export async function AgentLayoutGate({ children }: { children: ReactNode }) {
  const agent = await getSessionAgent();
  if (!agent) {
    const cookieStore = await cookies();
    if (cookieStore.get(AGENT_JWT_COOKIE)?.value) {
      redirect(staleSessionClearPath("agent", AGENT_LOGIN_PATH));
    }
    redirect(AGENT_LOGIN_PATH);
  }

  return (
    <RoleDashboardShell
      role="agent"
      displayName={agent.name}
      displayEmail={agent.email}
      accountId={agent.account_id}
      hierarchy={getAgentHierarchyChain(agent)}
    >
      {children}
    </RoleDashboardShell>
  );
}
