import { forwardRoleAuthRequest } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return forwardRoleAuthRequest("admin", `/api/admin/leaves/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body,
  });
}
