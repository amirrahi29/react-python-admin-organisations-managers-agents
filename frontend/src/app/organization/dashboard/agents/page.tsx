import type { Metadata } from "next";
import { TeamManagementPage } from "@/components/team/team-management-page";

export const metadata: Metadata = {
  title: "Agents",
  description: "Manage agents in your organization.",
};

export default function OrganizationAgentsPage() {
  return (
    <TeamManagementPage
      kind="agent"
      scope="organization"
      title="Agents"
      description="Add agents under your managers, update their details, block access, or remove them."
    />
  );
}
