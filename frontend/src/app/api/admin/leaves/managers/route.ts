import { forwardRoleAuthRequest } from "@/lib/auth/server";

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month");
  const path = month
    ? `/api/admin/leaves/managers?month=${encodeURIComponent(month)}`
    : "/api/admin/leaves/managers";
  return forwardRoleAuthRequest("admin", path, { method: "GET" });
}
