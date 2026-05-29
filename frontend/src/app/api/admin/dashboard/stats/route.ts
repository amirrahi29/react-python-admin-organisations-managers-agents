import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET() {
  const response = await forwardRoleAuthRequest("admin", "/api/admin/dashboard/stats", {
    method: "GET",
  });
  if (response.ok) {
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
  }
  return response;
}
