import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const path = date ? `/api/agent/attendance?date=${encodeURIComponent(date)}` : "/api/agent/attendance";
  return forwardRoleAuthRequest("agent", path, { method: "GET" });
}
