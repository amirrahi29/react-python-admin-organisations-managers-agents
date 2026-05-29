"use client";

import Link from "next/link";
import { UserCog } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { DashboardRouteLoading } from "@/components/layout/dashboard-route-loading";
import { FadeIn, PageEnter } from "@/components/ui/motion";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { WorkforcePresenceStrip } from "@/components/attendance/workforce-presence-strip";
import { useWorkforcePresence } from "@/hooks/use-workforce-presence";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { MANAGER_ATTENDANCE_PATH } from "@/lib/attendance/constants";
import type { ManagerInfo } from "@/lib/auth/constants";
import { getManagerDashboardStats } from "@/lib/dashboard/client";
import type { ManagerDashboardStats } from "@/lib/dashboard/types";
import { MANAGER_AGENTS_PATH } from "@/lib/team/constants";

export function ManagerDashboardAnalytics({
  manager,
  initialStats = null,
}: {
  manager: ManagerInfo;
  initialStats?: ManagerDashboardStats | null;
}) {
  const firstName = manager.name.split(" ")[0] ?? "Manager";
  const { stats, loading, error } = useDashboardStats<ManagerDashboardStats>({
    fetcher: getManagerDashboardStats,
    initialStats,
    errorMessage: "Unable to load dashboard stats.",
  });
  const { kpis, loading: presenceLoading, error: presenceError } = useWorkforcePresence("manager-agents");

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
        <div>
          <p className="app-section-label text-primary">Manager workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Welcome, {firstName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your team overview — agents and attendance at a glance.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={20}>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total agents" value={summary.agents} />
          <StatCard label="Active agents" value={summary.active_agents} />
          <StatCard label="Blocked agents" value={summary.blocked_agents} />
        </div>
      </FadeIn>

      {presenceError ? <Alert variant="error">{presenceError}</Alert> : null}
      <FadeIn delay={40}>
        <WorkforcePresenceStrip
          title="Team presence"
          subtitle="Who is logged in, online, and available right now."
          href={MANAGER_ATTENDANCE_PATH}
          kpis={kpis}
          loading={presenceLoading}
        />
      </FadeIn>

      <FadeIn delay={60}>
        <section className="app-surface app-surface--elevated overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <UserCog className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Your agents</h2>
            </div>
            <Link href={MANAGER_AGENTS_PATH} className="app-link text-sm font-medium">
              Manage agents
            </Link>
          </div>
          <div className="app-table-wrap overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.agents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground">
                      No agents in your team yet.
                    </td>
                  </tr>
                ) : (
                  stats.agents.map((agent) => (
                    <tr key={agent.agent_id}>
                      <td className="font-medium">{agent.name}</td>
                      <td>{agent.email}</td>
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
    </PageEnter>
  );
}
