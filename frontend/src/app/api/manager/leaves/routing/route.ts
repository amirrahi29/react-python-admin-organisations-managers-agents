import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET() {
  return forwardRoleAuthRequest("manager", "/api/manager/leaves/routing", { method: "GET" });
}
