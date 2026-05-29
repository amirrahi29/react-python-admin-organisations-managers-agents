import type { Metadata } from "next";
import { TeamManagementPage } from "@/components/team/team-management-page";

export const metadata: Metadata = {
  title: "Managers",
  description: "Manage managers in your organization.",
};

export default function OrganizationManagersPage() {
  return (
    <TeamManagementPage
      kind="manager"
      scope="organization"
      title="Managers"
      description="Add managers to your organization, update their details, block access, or remove them."
    />
  );
}
