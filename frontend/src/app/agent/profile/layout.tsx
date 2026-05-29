import { AgentLayoutGate } from "@/components/layout/role-layout-gate";

export default async function AgentProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentLayoutGate>{children}</AgentLayoutGate>;
}
