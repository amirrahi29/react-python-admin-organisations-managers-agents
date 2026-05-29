export const ADMIN_MANAGERS_PATH = "/admin/dashboard/managers";
export const ADMIN_AGENTS_PATH = "/admin/dashboard/agents";
export const MANAGER_AGENTS_PATH = "/manager/dashboard/agents";

export const AGENT_ROLE_LABEL = "Agent";

export function getAgentRoleLabel() {
  return AGENT_ROLE_LABEL;
}

export function getAdminManagerAgentsPath(accountId: string) {
  return `/admin/dashboard/managers/${encodeURIComponent(accountId)}/agents`;
}

export function parseManagerMemberId(accountId: string) {
  const match = /^AVM-(\d+)$/i.exec(accountId.trim());
  return match ? Number(match[1]) : null;
}

export function getAgentsListPath(scope: "admin" | "manager") {
  return scope === "manager" ? MANAGER_AGENTS_PATH : ADMIN_AGENTS_PATH;
}

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type PaginationMeta = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type PaginatedTeamResponse = {
  items: TeamMember[];
  pagination: PaginationMeta;
};

export type TeamStatusFilter = "all" | "active" | "inactive";

export type ListTeamParams = {
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
  status?: TeamStatusFilter;
  managerAccountId?: string;
  organizationId?: number;
  search?: string;
};

export type ActorInfo = {
  name: string;
  email: string;
};

export type TeamMember = {
  account_id: string;
  email: string;
  name: string;
  phone?: string | null;
  job_title?: string | null;
  is_active: number;
  agent_count?: number;
  organization_id?: number;
  organization_name?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  manager?: ActorInfo;
};

export type CreateManagerPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  jobTitle: string;
  organizationId: number;
};

export type CreateAgentPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  jobTitle: string;
  managerAccountId: string;
};

export type CreateManagerAgentPayload = Omit<CreateAgentPayload, "managerAccountId">;

export type UpdateManagerPayload = {
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
};

export type UpdateAgentPayload = {
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  managerAccountId: string;
};

export type UpdateManagerAgentPayload = Omit<UpdateAgentPayload, "managerAccountId">;

export type TeamMemberResponse = {
  item: TeamMember;
  message?: string;
};
