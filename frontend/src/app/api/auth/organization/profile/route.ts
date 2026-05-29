import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function PATCH(request: Request) {
  const body = await request.text();
  return forwardRoleAuthRequest("organization", "/api/auth/organization/profile", {
    method: "PATCH",
    body,
  });
}
