import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET(request: Request) {
  const query = new URL(request.url).search;
  return forwardRoleAuthRequest("organization", `/api/organization/managers${query}`, {
    method: "GET",
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  return forwardRoleAuthRequest("organization", "/api/organization/managers", {
    method: "POST",
    body,
  });
}
