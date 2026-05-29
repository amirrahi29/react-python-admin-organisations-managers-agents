import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { OrganizationProfilePageClient } from "@/components/profile/organization-profile-page";
import { ORGANIZATION_LOGIN_PATH } from "@/lib/auth/constants";
import { getSessionOrganization } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Organization profile",
  description: "Manage your organization account settings.",
};

export default async function OrganizationProfileRoute() {
  const organization = await getSessionOrganization();
  if (!organization) {
    redirect(ORGANIZATION_LOGIN_PATH);
  }

  return <OrganizationProfilePageClient organization={organization} />;
}
