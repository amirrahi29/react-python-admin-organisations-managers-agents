import { ManagerLayoutGate } from "@/components/layout/role-layout-gate";

export default async function ManagerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagerLayoutGate>{children}</ManagerLayoutGate>;
}
