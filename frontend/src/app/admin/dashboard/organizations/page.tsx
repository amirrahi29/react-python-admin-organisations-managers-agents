import type { Metadata } from "next";
import { OrganizationsManagementPage } from "@/components/organizations/organizations-management-page";

export const metadata: Metadata = {
  title: "Organizations",
  description: "Manage organizations in the admin panel.",
};

export default function AdminOrganizationsPage() {
  return <OrganizationsManagementPage />;
}
