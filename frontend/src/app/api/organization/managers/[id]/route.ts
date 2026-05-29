import { forwardRoleAuthRequest } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return forwardRoleAuthRequest(
    "organization",
    `/api/organization/managers/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return forwardRoleAuthRequest(
    "organization",
    `/api/organization/managers/${encodeURIComponent(id)}`,
    { method: "PATCH", body },
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return forwardRoleAuthRequest(
    "organization",
    `/api/organization/managers/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
