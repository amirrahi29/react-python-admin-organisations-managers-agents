import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function POST() {
  return forwardRoleAuthRequest("agent", "/api/auth/agent/logout", {
    method: "POST",
  });
}
