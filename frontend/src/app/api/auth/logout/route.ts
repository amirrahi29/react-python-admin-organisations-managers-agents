import { forwardAuthRequest } from "@/lib/auth/server";

export async function POST() {
  return forwardAuthRequest("/api/auth/logout", {
    method: "POST",
  });
}
