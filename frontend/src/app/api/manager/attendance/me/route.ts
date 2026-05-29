import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const path = date
    ? `/api/manager/attendance/me?date=${encodeURIComponent(date)}`
    : "/api/manager/attendance/me";
  return forwardRoleAuthRequest("manager", path, { method: "GET" });
}
