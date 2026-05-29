import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET() {
  return forwardRoleAuthRequest("admin", "/api/admin/leaves/pending", { method: "GET" });
}
