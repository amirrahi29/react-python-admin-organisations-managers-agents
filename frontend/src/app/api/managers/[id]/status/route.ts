import { forwardAuthRequest } from "@/lib/auth/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.text();
  return forwardAuthRequest(`/api/managers/${id}/status`, {
    method: "PATCH",
    body,
  });
}
