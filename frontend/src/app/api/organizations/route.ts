import { forwardAuthRequest } from "@/lib/auth/server";

export async function GET(request: Request) {
  const query = new URL(request.url).search;
  return forwardAuthRequest(`/api/organizations${query}`, { method: "GET" });
}

export async function POST(request: Request) {
  const body = await request.text();
  return forwardAuthRequest("/api/organizations", { method: "POST", body });
}
