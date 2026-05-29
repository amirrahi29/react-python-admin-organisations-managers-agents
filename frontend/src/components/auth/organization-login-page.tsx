"use client";

import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { AuthShell } from "@/components/layout/auth-shell";
import { AuthPortalLinks, RoleLoginForm } from "@/components/auth/role-login-form";
import { loginOrganization } from "@/lib/auth/client";
import { ADMIN_LOGIN_PATH, ORGANIZATION_DASHBOARD_PATH } from "@/lib/auth/constants";

export function OrganizationLoginPage() {
  return (
    <AuthShell
      title="Organization workspace"
      description="Sign in with your organization email and password to manage managers and teams."
      features={[
        { icon: Building2, text: "Organization-level management" },
        { icon: Users, text: "Managers and agents under your org" },
      ]}
    >
      <RoleLoginForm
        title="Organization sign in"
        description="Use the organization email and password created by your platform admin."
        emailPlaceholder="org@company.com"
        onSubmit={async (payload) => {
          await loginOrganization(payload);
          window.location.href = ORGANIZATION_DASHBOARD_PATH;
        }}
        footer={
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Platform setup?{" "}
              <Link href={ADMIN_LOGIN_PATH} className="app-link">
                Admin portal
              </Link>
            </p>
            <AuthPortalLinks current="organization" />
          </div>
        }
      />
    </AuthShell>
  );
}
