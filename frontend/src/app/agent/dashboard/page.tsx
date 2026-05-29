import type { Metadata } from "next";
import { AgentDashboard } from "@/components/dashboard/agent-dashboard";
import { getSessionAgent } from "@/lib/auth/server";
import { getAgentDashboardStatsServer } from "@/lib/dashboard/server";

export const metadata: Metadata = {
  title: "Agent dashboard",
  description: "Agent workspace overview.",
};

export default async function AgentDashboardPage() {
  const [agent, initialStats] = await Promise.all([
    getSessionAgent(),
    getAgentDashboardStatsServer(),
  ]);
  if (!agent) return null;

  return <AgentDashboard agent={agent} initialStats={initialStats} />;
}
