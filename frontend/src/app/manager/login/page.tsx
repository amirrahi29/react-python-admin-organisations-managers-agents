import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ManagerLoginPage } from "@/components/auth/manager-login-page";
import { MANAGER_DASHBOARD_PATH } from "@/lib/auth/constants";
import { getSessionManager } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Manager sign in",
  description: "Sign in to the manager workspace.",
};

export default async function ManagerLoginRoute() {
  const manager = await getSessionManager();
  if (manager) {
    redirect(MANAGER_DASHBOARD_PATH);
  }

  return <ManagerLoginPage />;
}
