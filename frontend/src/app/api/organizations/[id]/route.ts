import { forwardAuthRequest } from "@/lib/auth/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardAuthRequest(`/api/organizations/${id}`, { method: "GET" });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.text();
  return forwardAuthRequest(`/api/organizations/${id}`, { method: "PATCH", body });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardAuthRequest(`/api/organizations/${id}`, { method: "DELETE" });
}
