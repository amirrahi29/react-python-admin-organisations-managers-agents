import type { Metadata } from "next";
import { TeamManagementPage } from "@/components/team/team-management-page";

export const metadata: Metadata = {
  title: "Managers",
  description: "Manage managers in the admin panel.",
};

export default function ManagersPage() {
  return (
    <TeamManagementPage
      kind="manager"
      title="Managers"
      description="Add managers linked to your admin account, update their status, or remove access. Email notifications are sent for every change."
    />
  );
}
