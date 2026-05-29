"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Shield, UserCog } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { DataTableToolbar, type DataTableFilterOption } from "@/components/ui/data-table-toolbar";
import { AuthError } from "@/lib/auth/constants";
import {
  listOrganizationAgents,
  listOrganizationManagers,
} from "@/lib/organizations/team-client";
import type { TeamMember, TeamStatusFilter } from "@/lib/team/constants";
import { DEFAULT_PAGE_SIZE } from "@/lib/team/constants";

type OrganizationTeamKind = "manager" | "agent";

const COPY: Record<
  OrganizationTeamKind,
  { title: string; description: string; empty: string; icon: typeof Shield }
> = {
  manager: {
    title: "Managers",
    description: "Managers assigned to your organization and their team sizes.",
    empty: "No managers in this organization yet.",
    icon: Shield,
  },
  agent: {
    title: "Agents",
    description: "Agents working under managers in your organization.",
    empty: "No agents in this organization yet.",
    icon: UserCog,
  },
};

export function OrganizationTeamListPage({ kind }: { kind: OrganizationTeamKind }) {
  const copy = COPY[kind];
  const [items, setItems] = useState<TeamMember[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamStatusFilter>("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [managers, setManagers] = useState<TeamMember[]>([]);

  const loadItems = useCallback(
    async (override?: { page?: number; pageSize?: number }) => {
      const targetPage = override?.page ?? page;
      const targetPageSize = override?.pageSize ?? pageSize;
      setLoading(true);
      setError("");
      try {
        const data =
          kind === "manager"
            ? await listOrganizationManagers({
                page: targetPage,
                pageSize: targetPageSize,
                status: statusFilter,
                search: search.trim() || undefined,
              })
            : await listOrganizationAgents({
                page: targetPage,
                pageSize: targetPageSize,
                status: statusFilter,
                search: search.trim() || undefined,
                managerAccountId: managerFilter !== "all" ? managerFilter : undefined,
              });
        setItems(data.items);
        setPagination(data.pagination);
        if (override?.page !== undefined) setPage(override.page);
        if (override?.pageSize !== undefined) setPageSize(override.pageSize);
      } catch (err) {
        setError(err instanceof AuthError ? err.message : "Unable to load team members.");
      } finally {
        setLoading(false);
      }
    },
    [kind, managerFilter, page, pageSize, search, statusFilter],
  );

  useEffect(() => {
    if (kind !== "agent") return;
    void listOrganizationManagers({ page: 1, pageSize: 100, status: "active" })
      .then((data) => setManagers(data.items))
      .catch(() => setManagers([]));
  }, [kind]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filters = useMemo<DataTableFilterOption[]>(() => {
    const base: DataTableFilterOption[] = [
      {
        id: "status",
        label: "Status",
        value: statusFilter,
        options: [
          { value: "all", label: "All status" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ];
    if (kind === "agent" && managers.length > 0) {
      base.push({
        id: "manager",
        label: "Manager",
        value: managerFilter,
        options: [
          { value: "all", label: "All managers" },
          ...managers.map((manager) => ({
            value: manager.account_id,
            label: manager.name,
          })),
        ],
      });
    }
    return base;
  }, [kind, managerFilter, managers, statusFilter]);

  function handleFilterChange(id: string, value: string) {
    setPage(1);
    if (id === "status") {
      setStatusFilter(value as TeamStatusFilter);
      return;
    }
    if (id === "manager") {
      setManagerFilter(value);
    }
  }

  return (
    <div className="app-page-wide space-y-6">
      <FadeIn>
        <PageHeader
          label="Team"
          title={copy.title}
          description={copy.description}
          actions={
            <Button type="button" variant="secondary" onClick={() => void loadItems()} disabled={loading}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          }
        />
      </FadeIn>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <FadeIn delay={40} className="app-surface app-surface--elevated overflow-hidden">
        <DataTableToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="Search name, email, phone, or job title..."
          filters={filters}
          onFilterChange={handleFilterChange}
          resultLabel={`${pagination.total} ${kind === "manager" ? "managers" : "agents"} found`}
        />

        {loading ? (
          <TableSkeleton rows={5} columns={kind === "manager" ? 6 : 7} />
        ) : pagination.total === 0 ? (
          <EmptyState icon={copy.icon} title={`No ${copy.title.toLowerCase()} yet`} description={copy.empty} />
        ) : (
          <>
            <div className="app-table-wrap overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Job title</th>
                    {kind === "manager" ? <th>Agents</th> : <th>Manager</th>}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.account_id}>
                      <td>{(pagination.page - 1) * pagination.page_size + index + 1}</td>
                      <td className="font-medium">{item.name}</td>
                      <td>{item.email}</td>
                      <td>{item.phone || "—"}</td>
                      <td>{item.job_title || "—"}</td>
                      {kind === "manager" ? (
                        <td>{item.agent_count ?? 0}</td>
                      ) : (
                        <td>
                          <div>{item.manager?.name || "—"}</div>
                          {item.manager?.email ? (
                            <div className="text-xs text-muted-foreground">{item.manager.email}</div>
                          ) : null}
                        </td>
                      )}
                      <td>
                        <StatusBadge active={item.is_active === 1} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={pagination}
              label={kind === "manager" ? "managers" : "agents"}
              disabled={loading}
              onPageChange={(nextPage) => void loadItems({ page: nextPage, pageSize })}
              onPageSizeChange={(nextPageSize) => void loadItems({ page: 1, pageSize: nextPageSize })}
            />
          </>
        )}
      </FadeIn>
    </div>
  );
}
