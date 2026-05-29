import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AgentLoginPage } from "@/components/auth/agent-login-page";
import { AGENT_DASHBOARD_PATH } from "@/lib/auth/constants";
import { getSessionAgent } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Agent sign in",
  description: "Sign in to the agent workspace.",
};

export default async function AgentLoginRoute() {
  const agent = await getSessionAgent();
  if (agent) {
    redirect(AGENT_DASHBOARD_PATH);
  }

  return <AgentLoginPage />;
}
