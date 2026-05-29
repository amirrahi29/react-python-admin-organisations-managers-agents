"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/layout/auth-shell";
import { AuthPortalLinks, RoleLoginForm } from "@/components/auth/role-login-form";
import { useAuth } from "@/components/providers/auth-provider";
import { login } from "@/lib/auth/client";
import { ADMIN_DASHBOARD_PATH, ADMIN_REGISTER_PATH } from "@/lib/auth/constants";

export function AdminLoginPage() {
  const router = useRouter();
  const { setAdmin } = useAuth();

  return (
    <AuthShell
      title="Admin control center"
      description="Sign in to register organizations, manage platform settings, and oversee the full workspace."
      features={[
        { icon: ShieldCheck, text: "Secure admin sign-in" },
        { icon: KeyRound, text: "Protected session management" },
      ]}
    >
      <RoleLoginForm
        title="Admin sign in"
        description="Use your admin email and password to continue."
        emailPlaceholder="admin@company.com"
        onSubmit={async (payload) => {
          const data = await login(payload);
          setAdmin(data.admin);
          router.refresh();
          window.location.href = ADMIN_DASHBOARD_PATH;
        }}
        footer={
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href={ADMIN_REGISTER_PATH} className="app-link">
                Register
              </Link>
            </p>
            <AuthPortalLinks current="admin" />
          </div>
        }
      />
    </AuthShell>
  );
}
