import { forwardRoleAuthRequest } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return forwardRoleAuthRequest(
    "organization",
    `/api/organization/agents/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body },
  );
}
