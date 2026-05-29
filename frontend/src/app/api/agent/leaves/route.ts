import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET() {
  return forwardRoleAuthRequest("agent", "/api/agent/leaves", { method: "GET" });
}

export async function POST(request: Request) {
  const body = await request.text();
  return forwardRoleAuthRequest("agent", "/api/agent/leaves", { method: "POST", body });
}
