import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET() {
  return forwardRoleAuthRequest("manager", "/api/manager/leaves", { method: "GET" });
}

export async function POST(request: Request) {
  const body = await request.text();
  return forwardRoleAuthRequest("manager", "/api/manager/leaves", { method: "POST", body });
}
