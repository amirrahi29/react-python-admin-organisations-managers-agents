import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_PROFILE_PATH,
  ADMIN_REGISTER_PATH,
  AGENT_DASHBOARD_PATH,
  AGENT_LOGIN_PATH,
  AGENT_PROFILE_PATH,
  MANAGER_DASHBOARD_PATH,
  MANAGER_LOGIN_PATH,
  MANAGER_PROFILE_PATH,
  ORGANIZATION_LOGIN_PATH,
  ORGANIZATION_DASHBOARD_PATH,
  ORGANIZATION_PROFILE_PATH,
  PORTAL_PATH,
  ROLE_AUTH,
  type AuthRole,
} from "@/lib/auth/constants";

function hasAuthCookie(request: NextRequest, role: AuthRole): boolean {
  return Boolean(request.cookies.get(ROLE_AUTH[role].cookie)?.value);
}

async function isRoleLoggedIn(request: NextRequest, role: AuthRole) {
  return hasAuthCookie(request, role);
}

const protectedRoutes: Array<{ prefix: string; role: AuthRole; loginPath: string }> = [
  { prefix: ADMIN_DASHBOARD_PATH, role: "admin", loginPath: ADMIN_LOGIN_PATH },
  { prefix: ADMIN_PROFILE_PATH, role: "admin", loginPath: ADMIN_LOGIN_PATH },
  { prefix: ORGANIZATION_DASHBOARD_PATH, role: "organization", loginPath: ORGANIZATION_LOGIN_PATH },
  { prefix: ORGANIZATION_PROFILE_PATH, role: "organization", loginPath: ORGANIZATION_LOGIN_PATH },
  { prefix: MANAGER_DASHBOARD_PATH, role: "manager", loginPath: MANAGER_LOGIN_PATH },
  { prefix: MANAGER_PROFILE_PATH, role: "manager", loginPath: MANAGER_LOGIN_PATH },
  { prefix: AGENT_DASHBOARD_PATH, role: "agent", loginPath: AGENT_LOGIN_PATH },
  { prefix: AGENT_PROFILE_PATH, role: "agent", loginPath: AGENT_LOGIN_PATH },
];

const guestRoutes: Array<{ path: string; role: AuthRole; dashboardPath: string }> = [
  { path: ADMIN_LOGIN_PATH, role: "admin", dashboardPath: ADMIN_DASHBOARD_PATH },
  { path: ADMIN_REGISTER_PATH, role: "admin", dashboardPath: ADMIN_DASHBOARD_PATH },
  { path: ORGANIZATION_LOGIN_PATH, role: "organization", dashboardPath: ORGANIZATION_DASHBOARD_PATH },
  { path: MANAGER_LOGIN_PATH, role: "manager", dashboardPath: MANAGER_DASHBOARD_PATH },
  { path: AGENT_LOGIN_PATH, role: "agent", dashboardPath: AGENT_DASHBOARD_PATH },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  for (const route of guestRoutes) {
    if (pathname === route.path) {
      // Do not auto-redirect to dashboard from cookie presence alone — an expired
      // token still looks "logged in" here and causes a login ↔ dashboard loop.
      return NextResponse.next();
    }
  }

  for (const route of protectedRoutes) {
    if (pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)) {
      const loggedIn = await isRoleLoggedIn(request, route.role);
      if (!loggedIn) {
        return NextResponse.redirect(new URL(route.loginPath, request.url));
      }
      return NextResponse.next();
    }
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const suffix = pathname.replace(/^\/dashboard/, "") || "";
    return NextResponse.redirect(new URL(`${ADMIN_DASHBOARD_PATH}${suffix}`, request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(PORTAL_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/admin/login",
    "/admin/register",
    "/organization/login",
    "/organization/dashboard/:path*",
    "/organization/profile",
    "/admin/dashboard/:path*",
    "/admin/profile",
    "/manager/login",
    "/manager/dashboard/:path*",
    "/manager/profile",
    "/agent/login",
    "/agent/dashboard/:path*",
    "/agent/profile",
  ],
};
