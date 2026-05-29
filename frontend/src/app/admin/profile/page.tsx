import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminProfilePage } from "@/components/profile/admin-profile-page";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/constants";
import { getSessionAdmin } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Profile",
  description: "Update your admin profile details.",
};

export default async function AdminProfileRoute() {
  const admin = await getSessionAdmin();
  if (!admin) {
    redirect(ADMIN_LOGIN_PATH);
  }

  return <AdminProfilePage admin={admin} />;
}
