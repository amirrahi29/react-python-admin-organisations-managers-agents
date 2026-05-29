import { NextResponse } from "next/server";
import { ROLE_AUTH, type AuthRole } from "@/lib/auth/constants";

function parseRole(value: string | null): AuthRole | null {
  if (value === "admin" || value === "organization" || value === "manager" || value === "agent") {
    return value;
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = parseRole(url.searchParams.get("role")) ?? "admin";
  const config = ROLE_AUTH[role];
  const redirectTo = url.searchParams.get("redirect") || config.loginPath;

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(config.cookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
