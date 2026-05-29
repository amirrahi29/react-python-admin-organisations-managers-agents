import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET() {
  return forwardRoleAuthRequest("organization", "/api/organization/dashboard/stats", {
    method: "GET",
  });
}
