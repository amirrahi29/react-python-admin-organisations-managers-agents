import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  JWT_MAX_AGE,
  ROLE_AUTH,
  type AdminInfo,
  type AgentInfo,
  type AuthRole,
  type ManagerInfo,
  type OrganizationInfo,
  authHeader,
  getBackendUrl,
  parseErrorMessage,
} from "@/lib/auth/constants";

/**
 * Parse an `?role=` query value used by attendance routes. Returns `null`
 * when the value is missing or refers to a role that cannot record
 * attendance (only agents and managers do).
 */
export function parseAttendanceRole(
  value: string | null,
): Exclude<AuthRole, "admin"> | null {
  if (value === "agent" || value === "manager") {
    return value;
  }
  return null;
}

function setAuthCookie(response: NextResponse, role: AuthRole, token: string) {
  response.cookies.set(ROLE_AUTH[role].cookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: JWT_MAX_AGE,
  });
}

function clearAuthCookie(response: NextResponse, role: AuthRole) {
  response.cookies.set(ROLE_AUTH[role].cookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function staleSessionClearPath(role: AuthRole, loginPath: string) {
  return `/api/auth/clear?role=${role}&redirect=${encodeURIComponent(loginPath)}`;
}

export async function forwardAuthRequest(
  path: string,
  init?: RequestInit
): Promise<NextResponse> {
  return forwardRoleAuthRequest("admin", path, init);
}

/** Login, register, and logout must work before a session cookie exists. */
function allowsMissingToken(role: AuthRole, path: string): boolean {
  const config = ROLE_AUTH[role];
  if (path === config.backendLoginPath || path === config.backendLogoutPath) {
    return true;
  }
  if (role === "admin" && path === "/api/auth/register") {
    return true;
  }
  return false;
}

export async function forwardRoleAuthRequest(
  role: AuthRole,
  path: string,
  init?: RequestInit
): Promise<NextResponse> {
  const config = ROLE_AUTH[role];
  const cookieStore = await cookies();
  const token = cookieStore.get(config.cookie)?.value;

  if (!token && path === config.backendLogoutPath) {
    const nextResponse = NextResponse.json({ message: "Logged out" });
    clearAuthCookie(nextResponse, role);
    return nextResponse;
  }

  if (!token && !allowsMissingToken(role, path)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Backend service is unavailable. Start the API server on port 8000." },
      { status: 503 },
    );
  }

  if (!response.ok) {
    const error = await parseErrorMessage(response);
    return NextResponse.json({ error }, { status: response.status });
  }

  const data = await response.json();
  const isLogin =
    path === config.backendLoginPath ||
    (role === "admin" && path === "/api/auth/register");

  if (isLogin && data.access_token) {
    const nextResponse = NextResponse.json({ [config.userKey]: data[config.userKey] });
    setAuthCookie(nextResponse, role, data.access_token);
    return nextResponse;
  }

  if (path === config.backendLogoutPath) {
    const nextResponse = NextResponse.json(data);
    clearAuthCookie(nextResponse, role);
    return nextResponse;
  }

  return NextResponse.json(data);
}

export async function forwardRoleAuthBinaryRequest(
  role: AuthRole,
  path: string,
  init?: RequestInit
): Promise<NextResponse> {
  const config = ROLE_AUTH[role];
  const cookieStore = await cookies();
  const token = cookieStore.get(config.cookie)?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Backend service is unavailable. Start the API server on port 8000." },
      { status: 503 },
    );
  }

  if (!response.ok) {
    const error = await parseErrorMessage(response);
    return NextResponse.json({ error }, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  const nextHeaders = new Headers();
  const contentType = response.headers.get("Content-Type");
  const contentLength = response.headers.get("Content-Length");
  if (contentType) nextHeaders.set("Content-Type", contentType);
  if (contentLength) nextHeaders.set("Content-Length", contentLength);
  nextHeaders.set("Accept-Ranges", "bytes");
  nextHeaders.set("Cache-Control", "private, max-age=3600");

  return new NextResponse(buffer, {
    status: response.status,
    headers: nextHeaders,
  });
}

export async function forwardRoleAuthMultipartRequest(
  role: AuthRole,
  path: string,
  formData: FormData
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ROLE_AUTH[role].cookie)?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}${path}`, {
      method: "POST",
      headers,
      body: formData,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Backend service is unavailable. Start the API server on port 8000." },
      { status: 503 },
    );
  }

  if (!response.ok) {
    const error = await parseErrorMessage(response);
    return NextResponse.json({ error }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

const getSessionUser = cache(async <T,>(role: AuthRole): Promise<T | null> => {
  const config = ROLE_AUTH[role];
  const cookieStore = await cookies();
  const token = cookieStore.get(config.cookie)?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${getBackendUrl()}${config.backendMePath}`, {
      headers: authHeader(token),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
});

export async function getSessionOrganization(): Promise<OrganizationInfo | null> {
  return getSessionUser<OrganizationInfo>("organization");
}

export async function getSessionAdmin(): Promise<AdminInfo | null> {
  return getSessionUser<AdminInfo>("admin");
}

export async function getSessionManager(): Promise<ManagerInfo | null> {
  return getSessionUser<ManagerInfo>("manager");
}

export async function getSessionAgent(): Promise<AgentInfo | null> {
  return getSessionUser<AgentInfo>("agent");
}
