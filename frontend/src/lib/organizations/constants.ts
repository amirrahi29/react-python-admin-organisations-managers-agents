export const ADMIN_ORGANIZATIONS_PATH = "/admin/dashboard/organizations";
export const ORGANIZATION_MANAGERS_PATH = "/organization/dashboard/managers";
export const ORGANIZATION_AGENTS_PATH = "/organization/dashboard/agents";

export function getAdminOrganizationManagersPath(organizationId: number) {
  return `/admin/dashboard/organizations/${organizationId}/managers`;
}

export type OrganizationRecord = {
  id: number;
  name: string;
  email: string;
  is_active: number;
  manager_count?: number;
  created_at: string;
  updated_at: string;
};

export type PaginatedOrganizationsResponse = {
  items: OrganizationRecord[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export type CreateOrganizationPayload = {
  name: string;
  email: string;
  password: string;
};

export type UpdateOrganizationPayload = {
  name: string;
};
