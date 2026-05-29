export const JWT_COOKIE = "admin_token";
export const MANAGER_JWT_COOKIE = "manager_token";
export const AGENT_JWT_COOKIE = "agent_token";
export const ORGANIZATION_JWT_COOKIE = "organization_token";

export const JWT_MAX_AGE = 60 * 60 * 24 * 7;

export const PORTAL_PATH = "/login";

export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_REGISTER_PATH = "/admin/register";
export const ADMIN_DASHBOARD_PATH = "/admin/dashboard";
export const ADMIN_PROFILE_PATH = "/admin/profile";

export const ORGANIZATION_LOGIN_PATH = "/organization/login";
export const ORGANIZATION_DASHBOARD_PATH = "/organization/dashboard";
export const ORGANIZATION_PROFILE_PATH = "/organization/profile";

export const MANAGER_LOGIN_PATH = "/manager/login";
export const MANAGER_DASHBOARD_PATH = "/manager/dashboard";
export const MANAGER_PROFILE_PATH = "/manager/profile";

export const AGENT_LOGIN_PATH = "/agent/login";
export const AGENT_DASHBOARD_PATH = "/agent/dashboard";
export const AGENT_PROFILE_PATH = "/agent/profile";

export type AdminInfo = {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  job_title?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OrganizationInfo = {
  id: number;
  name: string;
  email: string;
  admin: RoleHierarchyMember;
  created_at?: string;
  updated_at?: string;
};

export type ManagerInfo = {
  account_id: string;
  email: string;
  name: string;
  phone?: string | null;
  job_title?: string | null;
  admin: RoleHierarchyMember;
  organization: RoleHierarchyMember;
  created_at?: string;
  updated_at?: string;
};

export type RoleHierarchyMember = {
  role: string;
  name: string;
  email: string;
};

export type AgentInfo = {
  account_id: string;
  email: string;
  name: string;
  phone?: string | null;
  job_title?: string | null;
  admin: RoleHierarchyMember;
  organization: RoleHierarchyMember;
  manager: RoleHierarchyMember;
  created_at?: string;
  updated_at?: string;
};

export type UpdateProfilePayload = {
  name: string;
  phone?: string;
  jobTitle?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
};

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function getBackendUrl() {
  return process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
}

export async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { detail?: string | { msg?: string }[]; error?: string };
    if (typeof data.detail === "string") return data.detail;
    if (typeof data.error === "string") return data.error;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      return data.detail[0].msg;
    }
  } catch {
    // ignore
  }
  return "Something went wrong";
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export { authHeader };

export type AuthRole = "admin" | "organization" | "manager" | "agent";

export type RoleAuthConfig = {
  role: AuthRole;
  cookie: string;
  loginPath: string;
  dashboardPath: string;
  profilePath: string;
  loginApiPath: string;
  meApiPath: string;
  profileApiPath: string;
  logoutApiPath: string;
  backendLoginPath: string;
  backendMePath: string;
  backendProfilePath: string;
  backendLogoutPath: string;
  userKey: "admin" | "organization" | "manager" | "agent";
};

export const ROLE_AUTH: Record<AuthRole, RoleAuthConfig> = {
  admin: {
    role: "admin",
    cookie: JWT_COOKIE,
    loginPath: ADMIN_LOGIN_PATH,
    dashboardPath: ADMIN_DASHBOARD_PATH,
    profilePath: ADMIN_PROFILE_PATH,
    loginApiPath: "/api/auth/login",
    meApiPath: "/api/auth/me",
    profileApiPath: "/api/auth/profile",
    logoutApiPath: "/api/auth/logout",
    backendLoginPath: "/api/auth/login",
    backendMePath: "/api/auth/me",
    backendProfilePath: "/api/auth/profile",
    backendLogoutPath: "/api/auth/logout",
    userKey: "admin",
  },
  organization: {
    role: "organization",
    cookie: ORGANIZATION_JWT_COOKIE,
    loginPath: ORGANIZATION_LOGIN_PATH,
    dashboardPath: ORGANIZATION_DASHBOARD_PATH,
    profilePath: ORGANIZATION_PROFILE_PATH,
    loginApiPath: "/api/auth/organization/login",
    meApiPath: "/api/auth/organization/me",
    profileApiPath: "/api/auth/organization/profile",
    logoutApiPath: "/api/auth/organization/logout",
    backendLoginPath: "/api/auth/organization/login",
    backendMePath: "/api/auth/organization/me",
    backendProfilePath: "/api/auth/organization/profile",
    backendLogoutPath: "/api/auth/organization/logout",
    userKey: "organization",
  },
  manager: {
    role: "manager",
    cookie: MANAGER_JWT_COOKIE,
    loginPath: MANAGER_LOGIN_PATH,
    dashboardPath: MANAGER_DASHBOARD_PATH,
    profilePath: MANAGER_PROFILE_PATH,
    loginApiPath: "/api/auth/manager/login",
    meApiPath: "/api/auth/manager/me",
    profileApiPath: "/api/auth/manager/profile",
    logoutApiPath: "/api/auth/manager/logout",
    backendLoginPath: "/api/auth/manager/login",
    backendMePath: "/api/auth/manager/me",
    backendProfilePath: "/api/auth/manager/profile",
    backendLogoutPath: "/api/auth/manager/logout",
    userKey: "manager",
  },
  agent: {
    role: "agent",
    cookie: AGENT_JWT_COOKIE,
    loginPath: AGENT_LOGIN_PATH,
    dashboardPath: AGENT_DASHBOARD_PATH,
    profilePath: AGENT_PROFILE_PATH,
    loginApiPath: "/api/auth/agent/login",
    meApiPath: "/api/auth/agent/me",
    profileApiPath: "/api/auth/agent/profile",
    logoutApiPath: "/api/auth/agent/logout",
    backendLoginPath: "/api/auth/agent/login",
    backendMePath: "/api/auth/agent/me",
    backendProfilePath: "/api/auth/agent/profile",
    backendLogoutPath: "/api/auth/agent/logout",
    userKey: "agent",
  },
};
