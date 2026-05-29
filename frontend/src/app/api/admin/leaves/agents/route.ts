import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month");
  const path = month
    ? `/api/admin/leaves/agents?month=${encodeURIComponent(month)}`
    : "/api/admin/leaves/agents";
  return forwardRoleAuthRequest("admin", path, { method: "GET" });
}
