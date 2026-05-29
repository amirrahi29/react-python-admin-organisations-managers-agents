import type { Metadata } from "next";
import { OrganizationDashboardAnalytics } from "@/components/dashboard/organization-dashboard-analytics";
import { getSessionOrganization } from "@/lib/auth/server";
import { getOrganizationDashboardStatsServer } from "@/lib/dashboard/server";

export const metadata: Metadata = {
  title: "Organization dashboard",
  description: "Organization workspace overview.",
};

export default async function OrganizationDashboardPage() {
  const [organization, initialStats] = await Promise.all([
    getSessionOrganization(),
    getOrganizationDashboardStatsServer(),
  ]);
  if (!organization) return null;

  return <OrganizationDashboardAnalytics organization={organization} initialStats={initialStats} />;
}
