import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AgentProfilePageClient } from "@/components/profile/agent-profile-page";
import { AGENT_LOGIN_PATH } from "@/lib/auth/constants";
import { getSessionAgent } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Agent profile",
  description: "Manage your agent account settings.",
};

export default async function AgentProfileRoute() {
  const agent = await getSessionAgent();
  if (!agent) {
    redirect(AGENT_LOGIN_PATH);
  }

  return <AgentProfilePageClient agent={agent} />;
}
