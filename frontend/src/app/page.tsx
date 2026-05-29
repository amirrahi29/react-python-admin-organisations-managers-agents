import { redirect } from "next/navigation";
import { PORTAL_PATH } from "@/lib/auth/constants";

export default function Home() {
  redirect(PORTAL_PATH);
}
