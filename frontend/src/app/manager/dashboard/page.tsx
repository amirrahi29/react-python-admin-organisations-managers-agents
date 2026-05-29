import type { Metadata } from "next";
import { ManagerDashboardAnalytics } from "@/components/dashboard/manager-dashboard-analytics";
import { getSessionManager } from "@/lib/auth/server";
import { getManagerDashboardStatsServer } from "@/lib/dashboard/server";

export const metadata: Metadata = {
  title: "Manager dashboard",
  description: "Manager workspace overview.",
};

export default async function ManagerDashboardPage() {
  // Resolve session and prefetch the dashboard stats in parallel so the first
  // paint already includes KPIs (no post-hydration loading spinner).
  const [manager, initialStats] = await Promise.all([
    getSessionManager(),
    getManagerDashboardStatsServer(),
  ]);
  if (!manager) return null;

  return <ManagerDashboardAnalytics manager={manager} initialStats={initialStats} />;
}
