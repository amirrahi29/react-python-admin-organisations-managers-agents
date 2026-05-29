import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function PATCH(request: Request) {
  const body = await request.text();
  return forwardRoleAuthRequest("agent", "/api/auth/agent/profile", {
    method: "PATCH",
    body,
  });
}
