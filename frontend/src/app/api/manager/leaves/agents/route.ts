import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month");
  const path = month
    ? `/api/manager/leaves/agents?month=${encodeURIComponent(month)}`
    : "/api/manager/leaves/agents";
  return forwardRoleAuthRequest("manager", path, { method: "GET" });
}
