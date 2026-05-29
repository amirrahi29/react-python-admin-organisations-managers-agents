import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrganizationScopedManagersPage } from "@/components/team/organization-scoped-managers-page";

export const metadata: Metadata = {
  title: "Organization managers",
  description: "View and manage managers for an organization.",
};

export default async function AdminOrganizationManagersRoute({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const parsedId = Number(organizationId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    notFound();
  }

  return <OrganizationScopedManagersPage organizationId={parsedId} />;
}
