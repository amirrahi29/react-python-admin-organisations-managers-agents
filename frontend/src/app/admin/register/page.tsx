import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminRegisterPage } from "@/components/auth/admin-register-page";
import { ADMIN_DASHBOARD_PATH } from "@/lib/auth/constants";
import { getSessionAdmin } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Admin register",
  description: "Create a new admin account.",
};

export default async function AdminRegisterRoute() {
  const admin = await getSessionAdmin();
  if (admin) {
    redirect(ADMIN_DASHBOARD_PATH);
  }

  return <AdminRegisterPage />;
}
