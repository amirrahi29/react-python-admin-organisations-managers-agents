import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET() {
  return forwardRoleAuthRequest("agent", "/api/agent/dashboard/stats", {
    method: "GET",
  });
}
