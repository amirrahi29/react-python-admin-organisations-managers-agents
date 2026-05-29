import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function POST() {
  return forwardRoleAuthRequest("manager", "/api/auth/manager/logout", {
    method: "POST",
  });
}
