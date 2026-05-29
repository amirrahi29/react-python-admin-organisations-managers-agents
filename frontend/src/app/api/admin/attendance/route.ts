import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const date = url.searchParams.get("date");
  const base =
    scope === "agents" ? "/api/admin/attendance/agents" : "/api/admin/attendance/managers";
  const path = date ? `${base}?date=${encodeURIComponent(date)}` : base;
  return forwardRoleAuthRequest("admin", path, { method: "GET" });
}
