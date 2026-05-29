import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminDashboardAnalytics } from "@/components/dashboard/admin-dashboard-analytics";
import { DashboardRouteLoading } from "@/components/layout/dashboard-route-loading";
import { getAdminDashboardStatsServer } from "@/lib/dashboard/server";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Admin panel overview.",
};

async function AdminDashboardContent() {
  const initialStats = await getAdminDashboardStatsServer();
  return <AdminDashboardAnalytics initialStats={initialStats} />;
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardRouteLoading />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
