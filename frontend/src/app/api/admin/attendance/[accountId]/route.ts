import { forwardRoleAuthRequest } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ accountId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const date = url.searchParams.get("date");
  const base =
    scope === "agents"
      ? `/api/admin/attendance/agents/${encodeURIComponent(accountId)}`
      : `/api/admin/attendance/managers/${encodeURIComponent(accountId)}`;
  const path = date ? `${base}?date=${encodeURIComponent(date)}` : base;
  return forwardRoleAuthRequest("admin", path, { method: "GET" });
}
