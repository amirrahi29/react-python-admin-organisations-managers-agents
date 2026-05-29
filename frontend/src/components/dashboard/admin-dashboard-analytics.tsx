"use client";

import Link from "next/link";
import { Building2, Users, UserCog } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { FadeIn, PageEnter } from "@/components/ui/motion";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { WorkforcePresenceStrip } from "@/components/attendance/workforce-presence-strip";
import { DashboardRouteLoading } from "@/components/layout/dashboard-route-loading";
import { useWorkforcePresence } from "@/hooks/use-workforce-presence";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { ADMIN_ORGANIZATIONS_PATH } from "@/lib/organizations/constants";
import { ADMIN_AGENTS_PATH, ADMIN_MANAGERS_PATH, getAdminManagerAgentsPath } from "@/lib/team/constants";
import { getAdminDashboardStats } from "@/lib/dashboard/client";
import type { AdminDashboardStats } from "@/lib/dashboard/types";

type AdminDashboardAnalyticsProps = {
  initialStats?: AdminDashboardStats | null;
};

export function AdminDashboardAnalytics({ initialStats = null }: AdminDashboardAnalyticsProps) {
  const { stats, error } = useDashboardStats<AdminDashboardStats>({
    fetcher: getAdminDashboardStats,
    initialStats,
    errorMessage: "Unable to load dashboard stats.",
  });
  const { kpis, loading: presenceLoading, error: presenceError } = useWorkforcePresence("admin-managers");

  if (error) {
    return (
      <PageEnter className="app-page-wide">
        <Alert variant="error">{error}</Alert>
      </PageEnter>
    );
  }

  if (!stats) return <DashboardRouteLoading />;

  const { summary } = stats;

  return (
    <PageEnter className="app-page-wide space-y-6">
      <FadeIn>
        <div>
          <p className="app-section-label text-primary">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Team hierarchy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Organizations, managers, and agents across your workspace.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={20}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Organizations"
            value={summary.organizations}
            sub={`${summary.active_organizations} active`}
          />
          <StatCard
            label="Managers"
            value={summary.managers}
            sub={`${summary.active_managers} active`}
          />
          <StatCard
            label="Agents"
            value={summary.agents}
            sub={`${summary.active_agents} active`}
          />
        </div>
      </FadeIn>

      {presenceError ? <Alert variant="error">{presenceError}</Alert> : null}
      <FadeIn delay={40}>
        <WorkforcePresenceStrip
          title="Leadership presence"
          subtitle="Managers logged in, online, and available right now."
          href="/admin/dashboard/attendance"
          kpis={kpis}
          loading={presenceLoading}
        />
      </FadeIn>

      <FadeIn delay={60}>
        <section className="app-surface app-surface--elevated overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Organizations</h2>
            </div>
            <Link href={ADMIN_ORGANIZATIONS_PATH} className="app-link text-sm font-medium">
              View all
            </Link>
          </div>
          <div className="app-table-wrap overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Managers</th>
                  <th>Agents</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.organization_overview.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted-foreground">
                      No organizations yet.
                    </td>
                  </tr>
                ) : (
                  stats.organization_overview.map((org) => (
                    <tr key={org.organization_id}>
                      <td className="font-medium">{org.name}</td>
                      <td>{org.manager_count}</td>
                      <td>{org.agent_count}</td>
                      <td>
                        <StatusBadge active={org.is_active} />
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
        <section className="app-surface app-surface--elevated overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Managers</h2>
            </div>
            <Link href={ADMIN_MANAGERS_PATH} className="app-link text-sm font-medium">
              View all
            </Link>
          </div>
          <div className="app-table-wrap overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Organization</th>
                  <th>Agents</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.manager_overview.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted-foreground">
                      No managers yet.
                    </td>
                  </tr>
                ) : (
                  stats.manager_overview.map((manager) => (
                    <tr key={manager.manager_id}>
                      <td className="font-medium">{manager.name}</td>
                      <td>{manager.organization_name ?? "—"}</td>
                      <td>
                        {manager.account_id ? (
                          <Link
                            href={getAdminManagerAgentsPath(manager.account_id)}
                            className="app-link text-sm font-medium"
                          >
                            {manager.agent_count}
                          </Link>
                        ) : (
                          manager.agent_count
                        )}
                      </td>
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

      <FadeIn delay={100}>
        <div className="flex justify-end">
          <Link href={ADMIN_AGENTS_PATH} className="app-link inline-flex items-center gap-1.5 text-sm font-medium">
            <UserCog className="size-4" />
            Manage agents
          </Link>
        </div>
      </FadeIn>
    </PageEnter>
  );
}
