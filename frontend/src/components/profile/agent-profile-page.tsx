"use client";

import { useState } from "react";
import { RoleProfilePage } from "@/components/profile/role-profile-page";
import type { AgentInfo } from "@/lib/auth/constants";

export function AgentProfilePageClient({ agent: initialAgent }: { agent: AgentInfo }) {
  const [agent, setAgent] = useState(initialAgent);
  return (
    <RoleProfilePage
      authRole="agent"
      user={agent}
      onUpdated={(user) => setAgent(user as AgentInfo)}
    />
  );
}
