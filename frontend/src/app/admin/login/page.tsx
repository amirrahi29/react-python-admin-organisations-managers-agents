import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminLoginPage } from "@/components/auth/admin-login-page";
import { ADMIN_DASHBOARD_PATH } from "@/lib/auth/constants";
import { getSessionAdmin } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Admin sign in",
  description: "Sign in to the admin panel.",
};

export default async function AdminLoginRoute() {
  const admin = await getSessionAdmin();
  if (admin) {
    redirect(ADMIN_DASHBOARD_PATH);
  }

  return <AdminLoginPage />;
}
