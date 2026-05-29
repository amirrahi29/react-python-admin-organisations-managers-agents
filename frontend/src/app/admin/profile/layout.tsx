import { AdminLayoutGate } from "@/components/layout/role-layout-gate";

export default function AdminProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutGate>{children}</AdminLayoutGate>;
}
