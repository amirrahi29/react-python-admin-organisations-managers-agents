export type AdminDashboardSummary = {
  organizations: number;
  active_organizations: number;
  managers: number;
  active_managers: number;
  agents: number;
  active_agents: number;
};

export type OrganizationOverviewRow = {
  organization_id: number;
  name: string;
  is_active: boolean;
  manager_count: number;
  agent_count: number;
};

export type ManagerOverviewRow = {
  manager_id: number;
  account_id?: string;
  name: string;
  organization_id?: number;
  organization_name?: string | null;
  is_active: boolean;
  agent_count: number;
};

export type AdminDashboardStats = {
  summary: AdminDashboardSummary;
  organization_overview: OrganizationOverviewRow[];
  manager_overview: ManagerOverviewRow[];
};

export type ManagerDashboardSummary = {
  agents: number;
  active_agents: number;
  blocked_agents: number;
};

export type ManagerAgentRow = {
  agent_id: number;
  account_id?: string;
  name: string;
  email: string;
  is_active: boolean;
};

export type ManagerDashboardStats = {
  summary: ManagerDashboardSummary;
  agents: ManagerAgentRow[];
};

export type OrganizationDashboardSummary = {
  managers: number;
  active_managers: number;
  blocked_managers: number;
  agents: number;
  active_agents: number;
  blocked_agents: number;
};

export type OrganizationManagerRow = {
  manager_id: number;
  account_id?: string;
  name: string;
  email: string;
  phone?: string | null;
  job_title?: string | null;
  is_active: boolean;
  agent_count: number;
};

export type OrganizationAgentRow = {
  agent_id: number;
  account_id?: string;
  name: string;
  email: string;
  phone?: string | null;
  job_title?: string | null;
  is_active: boolean;
  manager_name?: string | null;
  manager_email?: string | null;
};

export type OrganizationDashboardStats = {
  summary: OrganizationDashboardSummary;
  managers: OrganizationManagerRow[];
  agents: OrganizationAgentRow[];
};

export type AgentDashboardSummary = {
  status: string;
};

export type AgentDashboardMember = {
  account_id: string;
  name: string;
  email: string;
  job_title?: string | null;
};

export type AgentDashboardHierarchyMember = {
  account_id?: string;
  name: string;
  email: string;
};

export type AgentDashboardOrganization = {
  id: number;
  name: string;
};

export type AgentDashboardStats = {
  summary: AgentDashboardSummary;
  agent: AgentDashboardMember;
  manager: AgentDashboardHierarchyMember | null;
  organization: AgentDashboardOrganization | null;
};
