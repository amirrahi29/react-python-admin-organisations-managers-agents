import { forwardAuthRequest } from "@/lib/auth/server";

export async function PATCH(request: Request) {
  const body = await request.text();
  return forwardAuthRequest("/api/auth/profile", {
    method: "PATCH",
    body,
  });
}
