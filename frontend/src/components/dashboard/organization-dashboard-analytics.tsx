"use client";

import Link from "next/link";
import { Shield, UserCog, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { DashboardRouteLoading } from "@/components/layout/dashboard-route-loading";
import { FadeIn, PageEnter } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import type { OrganizationInfo } from "@/lib/auth/constants";
import { getOrganizationDashboardStats } from "@/lib/dashboard/client";
import type { OrganizationDashboardStats } from "@/lib/dashboard/types";
import {
  ORGANIZATION_AGENTS_PATH,
  ORGANIZATION_MANAGERS_PATH,
} from "@/lib/organizations/constants";

export function OrganizationDashboardAnalytics({
  organization,
  initialStats = null,
}: {
  organization: OrganizationInfo;
  initialStats?: OrganizationDashboardStats | null;
}) {
  const { stats, loading, error } = useDashboardStats<OrganizationDashboardStats>({
    fetcher: getOrganizationDashboardStats,
    initialStats,
    errorMessage: "Unable to load organization dashboard.",
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

  if (!stats) return null;

  const { summary } = stats;

  return (
    <PageEnter className="app-page-wide space-y-6">
      <FadeIn>
        <PageHeader
          label="Organization"
          title={organization.name}
          description="Overview of managers and agents assigned to your organization."
        />
      </FadeIn>

      <FadeIn delay={20}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total managers" value={summary.managers} />
          <StatCard label="Active managers" value={summary.active_managers} />
          <StatCard label="Total agents" value={summary.agents} />
          <StatCard label="Active agents" value={summary.active_agents} />
        </div>
      </FadeIn>

      <FadeIn delay={40}>
        <section className="app-surface app-surface--elevated overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Managers</h2>
            </div>
            <Link href={ORGANIZATION_MANAGERS_PATH} className="app-link text-sm font-medium">
              View all managers
            </Link>
          </div>
          <div className="app-table-wrap overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Job title</th>
                  <th>Agents</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.managers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground">
                      No managers in this organization yet.
                    </td>
                  </tr>
                ) : (
                  stats.managers.map((manager) => (
                    <tr key={manager.manager_id}>
                      <td className="font-medium">{manager.name}</td>
                      <td>{manager.email}</td>
                      <td>{manager.phone || "—"}</td>
                      <td>{manager.job_title || "—"}</td>
                      <td>{manager.agent_count}</td>
                      <td>
                        <StatusBadge active={manager.is_active} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={60}>
        <section className="app-surface app-surface--elevated overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <UserCog className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Agents</h2>
            </div>
            <Link href={ORGANIZATION_AGENTS_PATH} className="app-link text-sm font-medium">
              View all agents
            </Link>
          </div>
          <div className="app-table-wrap overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Job title</th>
                  <th>Manager</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.agents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground">
                      No agents in this organization yet.
                    </td>
                  </tr>
                ) : (
                  stats.agents.map((agent) => (
                    <tr key={agent.agent_id}>
                      <td className="font-medium">{agent.name}</td>
                      <td>{agent.email}</td>
                      <td>{agent.phone || "—"}</td>
                      <td>{agent.job_title || "—"}</td>
                      <td>
                        <div>{agent.manager_name || "—"}</div>
                        {agent.manager_email ? (
                          <div className="text-xs text-muted-foreground">{agent.manager_email}</div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge active={agent.is_active} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={80}>
        <section className="app-profile-panel">
          <div className="app-profile-panel__header">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <p className="app-profile-panel__title">Platform owner</p>
            </div>
          </div>
          <div className="app-profile-panel__body">
            <p className="text-sm font-medium">{organization.admin.name}</p>
            <p className="text-sm text-muted-foreground">{organization.admin.email}</p>
          </div>
        </section>
      </FadeIn>
    </PageEnter>
  );
}
