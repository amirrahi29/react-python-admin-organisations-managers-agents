import type { ListTeamParams, TeamMember } from "@/lib/team/constants";

/** Common shape returned by team mutation endpoints. */
export type StatusActionResponse = {
  item: TeamMember;
  message: string;
  email_sent?: boolean;
};

/**
 * Build the `?...` query string used by `/api/managers` and `/api/agents` (and
 * scoped manager-side equivalents). Empty filters are omitted entirely.
 */
export function buildTeamQuery(params?: ListTeamParams) {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("page_size", String(params.pageSize));
  if (params?.activeOnly) search.set("active_only", "true");
  if (params?.status && params.status !== "all") search.set("status", params.status);
  if (params?.managerAccountId) {
    search.set("manager_account_id", params.managerAccountId);
  }
  if (params?.organizationId) {
    search.set("organization_id", String(params.organizationId));
  }
  if (params?.search?.trim()) search.set("search", params.search.trim());
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Safely escape an account id for use in a URL path segment. */
export function encodeAccountPath(accountId: string) {
  return encodeURIComponent(accountId);
}
