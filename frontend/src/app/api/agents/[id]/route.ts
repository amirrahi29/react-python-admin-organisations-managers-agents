import { forwardAuthRequest } from "@/lib/auth/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return forwardAuthRequest(`/api/agents/${id}`);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.text();
  return forwardAuthRequest(`/api/agents/${id}`, {
    method: "PATCH",
    body,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return forwardAuthRequest(`/api/agents/${id}`, { method: "DELETE" });
}
