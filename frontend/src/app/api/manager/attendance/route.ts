import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const path = date ? `/api/manager/attendance?date=${encodeURIComponent(date)}` : "/api/manager/attendance";
  return forwardRoleAuthRequest("manager", path, { method: "GET" });
}
