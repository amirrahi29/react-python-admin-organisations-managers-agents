import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function POST(request: Request) {
  const body = await request.text();
  return forwardRoleAuthRequest("manager", "/api/auth/manager/login", {
    method: "POST",
    body,
  });
}
