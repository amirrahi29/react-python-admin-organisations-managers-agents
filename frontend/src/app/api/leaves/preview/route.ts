import { NextResponse } from "next/server";
import { forwardRoleAuthRequest } from "@/lib/auth/server";
import type { AuthRole } from "@/lib/auth/constants";

function parseLeavePreviewRole(value: string | null): AuthRole | null {
  if (value === "admin" || value === "manager" || value === "agent") {
    return value;
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = parseLeavePreviewRole(url.searchParams.get("role"));
  if (!role) {
    return NextResponse.json({ error: "A valid role is required." }, { status: 400 });
  }

  const start = url.searchParams.get("start_date");
  const end = url.searchParams.get("end_date");
  const durationType = url.searchParams.get("duration_type") ?? "full_day";
  if (!start || !end) {
    return NextResponse.json({ error: "start_date and end_date are required." }, { status: 422 });
  }

  const path =
    `/api/leaves/preview?start_date=${encodeURIComponent(start)}` +
    `&end_date=${encodeURIComponent(end)}` +
    `&duration_type=${encodeURIComponent(durationType)}`;

  return forwardRoleAuthRequest(role, path, { method: "GET" });
}
