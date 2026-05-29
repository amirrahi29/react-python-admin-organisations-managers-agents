"use client";

import { useRouter } from "next/navigation";
import { KeyRound, UserCog } from "lucide-react";
import { AuthShell } from "@/components/layout/auth-shell";
import { AuthPortalLinks, RoleLoginForm } from "@/components/auth/role-login-form";
import { loginAgent } from "@/lib/auth/client";
import { AGENT_DASHBOARD_PATH } from "@/lib/auth/constants";

export function AgentLoginPage() {
  const router = useRouter();

  return (
    <AuthShell
      title="Agent workspace"
      description="Sign in with your assigned email to access your team workspace."
      features={[
        { icon: UserCog, text: "Team member dashboard" },
        { icon: KeyRound, text: "Secure agent sign in" },
      ]}
    >
      <RoleLoginForm
        title="Agent sign in"
        description="Use the email and password assigned by your manager."
        emailPlaceholder="agent@company.com"
        onSubmit={async (payload) => {
          await loginAgent(payload);
          router.refresh();
          window.location.href = AGENT_DASHBOARD_PATH;
        }}
        footer={<AuthPortalLinks current="agent" />}
      />
    </AuthShell>
  );
}
