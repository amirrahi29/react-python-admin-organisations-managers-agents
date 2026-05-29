"use client";

import { Building2, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { DashboardRouteLoading } from "@/components/layout/dashboard-route-loading";
import { FadeIn, PageEnter } from "@/components/ui/motion";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { type AgentInfo } from "@/lib/auth/constants";
import { getAgentRoleLabel } from "@/lib/team/constants";
import { getAgentDashboardStats } from "@/lib/dashboard/client";
import type { AgentDashboardStats } from "@/lib/dashboard/types";

export function AgentDashboard({
  agent,
  initialStats = null,
}: {
  agent: AgentInfo;
  initialStats?: AgentDashboardStats | null;
}) {
  const firstName = agent.name.split(" ")[0] ?? "Agent";
  const { stats, loading, error } = useDashboardStats<AgentDashboardStats>({
    fetcher: getAgentDashboardStats,
    initialStats,
    errorMessage: "Unable to load dashboard stats.",
  });

  if (loading && !stats) {
    return (
      <PageEnter className="app-page-wide">
        <DashboardRouteLoading />
      </PageEnter>
    );
  }

  if (error) {
    return (
      <PageEnter className="app-page-wide">
        <Alert variant="error">{error}</Alert>
      </PageEnter>
    );
  }

  const active = stats?.summary.status === "active";

  return (
    <PageEnter className="app-page-wide space-y-6">
      <FadeIn>
        <div>
          <p className="app-section-label text-primary">Agent workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Welcome, {firstName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your place in the team hierarchy.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={20}>
        <div className="app-surface app-surface--elevated p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Your role</p>
              <p className="mt-1 text-lg font-semibold">{getAgentRoleLabel()}</p>
              <p className="mt-1 text-sm text-muted-foreground">{agent.email}</p>
              {agent.job_title ? (
                <p className="mt-1 text-sm text-muted-foreground">{agent.job_title}</p>
              ) : null}
            </div>
            <StatusBadge active={active} />
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={40}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="app-surface app-surface--elevated p-4 sm:p-5">
            <div className="flex items-center gap-2 text-primary">
              <Users className="size-4" />
              <p className="text-sm font-semibold">Manager</p>
            </div>
            {agent.manager ? (
              <>
                <p className="mt-3 font-medium">{agent.manager.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{agent.manager.email}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No manager assigned.</p>
            )}
          </div>

          <div className="app-surface app-surface--elevated p-4 sm:p-5">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="size-4" />
              <p className="text-sm font-semibold">Organization</p>
            </div>
            {agent.organization ? (
              <>
                <p className="mt-3 font-medium">{agent.organization.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{agent.organization.email}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No organization linked.</p>
            )}
          </div>
        </div>
      </FadeIn>
    </PageEnter>
  );
}
