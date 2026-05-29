import { OrganizationLayoutGate } from "@/components/layout/role-layout-gate";

export default async function OrganizationDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrganizationLayoutGate>{children}</OrganizationLayoutGate>;
}
