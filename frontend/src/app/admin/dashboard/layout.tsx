import { AdminLayoutGate } from "@/components/layout/role-layout-gate";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutGate>{children}</AdminLayoutGate>;
}
