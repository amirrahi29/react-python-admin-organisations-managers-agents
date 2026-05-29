import { forwardAuthRequest } from "@/lib/auth/server";

export async function POST(request: Request) {
  const body = await request.text();
  return forwardAuthRequest("/api/auth/login", {
    method: "POST",
    body,
  });
}
