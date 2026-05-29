import type { Metadata } from "next";
import { PortalPage } from "@/components/auth/portal-page";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Choose your workspace portal.",
};

export default function LoginPortalRoute() {
  return <PortalPage />;
}
