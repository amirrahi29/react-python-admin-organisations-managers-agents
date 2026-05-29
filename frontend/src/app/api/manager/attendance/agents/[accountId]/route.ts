import { forwardRoleAuthRequest } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ accountId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const base = `/api/manager/attendance/agents/${encodeURIComponent(accountId)}`;
  const path = date ? `${base}?date=${encodeURIComponent(date)}` : base;
  return forwardRoleAuthRequest("manager", path, { method: "GET" });
}
