import type { Metadata } from "next";
import { TeamManagementPage } from "@/components/team/team-management-page";

export const metadata: Metadata = {
  title: "Agents",
  description: "Manage agents in the admin panel.",
};

export default function AdminAgentsPage() {
  return (
    <TeamManagementPage
      kind="agent"
      scope="admin"
      title="Agents"
      description="Add and manage agents under managers. Every agent belongs to a manager in the team hierarchy."
    />
  );
}
