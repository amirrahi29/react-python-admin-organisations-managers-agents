import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function POST() {
  return forwardRoleAuthRequest("organization", "/api/auth/organization/logout", {
    method: "POST",
  });
}
