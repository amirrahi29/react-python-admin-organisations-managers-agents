import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ManagerProfilePageClient } from "@/components/profile/manager-profile-page";
import { MANAGER_LOGIN_PATH } from "@/lib/auth/constants";
import { getSessionManager } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Manager profile",
  description: "Manage your manager account settings.",
};

export default async function ManagerProfileRoute() {
  const manager = await getSessionManager();
  if (!manager) {
    redirect(MANAGER_LOGIN_PATH);
  }

  return <ManagerProfilePageClient manager={manager} />;
}
