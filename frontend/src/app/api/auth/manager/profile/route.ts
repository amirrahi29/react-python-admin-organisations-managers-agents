import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function PATCH(request: Request) {
  const body = await request.text();
  return forwardRoleAuthRequest("manager", "/api/auth/manager/profile", {
    method: "PATCH",
    body,
  });
}
