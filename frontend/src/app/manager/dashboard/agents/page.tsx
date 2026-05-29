import type { Metadata } from "next";
import { TeamManagementPage } from "@/components/team/team-management-page";

export const metadata: Metadata = {
  title: "Agents",
  description: "Manage agents in your team.",
};

export default function ManagerAgentsPage() {
  return (
    <TeamManagementPage
      kind="agent"
      scope="manager"
      title="Agents"
      description="Add and manage agents in your team."
    />
  );
}
