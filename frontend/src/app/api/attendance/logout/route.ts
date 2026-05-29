import { NextResponse } from "next/server";
import { forwardRoleAuthRequest, parseAttendanceRole } from "@/lib/auth/server";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const role = parseAttendanceRole(url.searchParams.get("role"));
  if (!role) {
    return NextResponse.json({ error: "A valid role is required." }, { status: 400 });
  }

  return forwardRoleAuthRequest(role, "/api/attendance/logout", {
    method: "POST",
  });
}
