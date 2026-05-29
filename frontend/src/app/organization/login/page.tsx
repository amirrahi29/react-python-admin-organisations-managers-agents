import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { OrganizationLoginPage } from "@/components/auth/organization-login-page";
import { ORGANIZATION_DASHBOARD_PATH } from "@/lib/auth/constants";
import { getSessionOrganization } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Organization sign in",
  description: "Sign in to your organization workspace.",
};

export default async function OrganizationLoginRoute() {
  const organization = await getSessionOrganization();
  if (organization) {
    redirect(ORGANIZATION_DASHBOARD_PATH);
  }

  return <OrganizationLoginPage />;
}
