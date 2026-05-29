"use client";

import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/layout/auth-shell";
import { AuthPortalLinks, RoleLoginForm } from "@/components/auth/role-login-form";
import { loginManager } from "@/lib/auth/client";
import { MANAGER_DASHBOARD_PATH } from "@/lib/auth/constants";

export function ManagerLoginPage() {
  const router = useRouter();

  return (
    <AuthShell
      title="Manager workspace"
      description="Sign in to access your team dashboard, review your account details, and manage day-to-day operations."
      features={[
        { icon: ShieldCheck, text: "Secure manager access" },
        { icon: KeyRound, text: "Credentials provided by your admin" },
      ]}
    >
      <RoleLoginForm
        title="Manager sign in"
        description="Use the email and password sent to you by your administrator."
        emailPlaceholder="manager@company.com"
        onSubmit={async (payload) => {
          await loginManager(payload);
          router.refresh();
          window.location.href = MANAGER_DASHBOARD_PATH;
        }}
        footer={<AuthPortalLinks current="manager" />}
      />
    </AuthShell>
  );
}
