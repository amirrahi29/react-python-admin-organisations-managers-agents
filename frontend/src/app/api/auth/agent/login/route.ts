import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function POST(request: Request) {
  const body = await request.text();
  return forwardRoleAuthRequest("agent", "/api/auth/agent/login", {
    method: "POST",
    body,
  });
}
