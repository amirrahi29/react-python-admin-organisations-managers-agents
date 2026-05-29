"use client";

import { CalendarDays, Clock3, Users } from "lucide-react";
import { AttendancePersonDetailPanel } from "@/components/attendance/attendance-person-detail-panel";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { AttendanceTargetCell } from "@/components/attendance/attendance-target-cell";
import { Alert } from "@/components/ui/alert";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { FadeIn } from "@/components/ui/motion";
import { Pagination } from "@/components/ui/pagination";
import { useClientTable } from "@/hooks/use-client-table";
import {
  formatAttendanceMinutes,
  formatAttendanceTime,
} from "@/lib/attendance/constants";
import type { AttendanceViewPerspective } from "@/lib/attendance/constants";
import type { AttendanceDetailResponse, AttendanceSummaryRow } from "@/lib/attendance/types";
import {
  ATTENDANCE_PRESENCE_FILTER_OPTIONS,
  filterAttendanceSummaryRow,
  searchAttendanceSummaryRow,
} from "@/lib/table/filter-helpers";
import { todayInputValue } from "@/lib/utils";

type AttendanceListPageProps = {
  title: string;
  subtitle: string;
  items: AttendanceSummaryRow[];
  date: string;
  loading?: boolean;
  error?: string;
  embedded?: boolean;
  onDateChange: (date: string) => void;
  onSelect?: (item: AttendanceSummaryRow | null) => void;
  selectedAccountId?: string | null;
  detail?: AttendanceDetailResponse | null;
  detailLoading?: boolean;
  showManagerColumn?: boolean;
  roleLabel?: string;
  perspective?: AttendanceViewPerspective;
  activeLabel?: string;
  idleLabel?: string;
};

export function AttendanceListPage({
  title,
  subtitle,
  items,
  date,
  loading = false,
  error = "",
  embedded = false,
  onDateChange,
  onSelect,
  selectedAccountId,
  detail,
  detailLoading = false,
  showManagerColumn = false,
  roleLabel = "Employee",
  perspective = "review",
  activeLabel = "Active",
  idleLabel = "Idle",
}: AttendanceListPageProps) {
  const {
    search,
    setSearch,
    filters,
    setFilter,
    resetFilters,
    pageItems,
    pagination,
    setPage,
    setPageSize,
    hasActiveFilters,
  } = useClientTable({
    items,
    pageSize: 10,
    searchFn: searchAttendanceSummaryRow,
    filterFn: filterAttendanceSummaryRow,
  });

  const onlineCount = items.filter((item) => item.live_status === "online").length;
  const idleCount = items.filter((item) => item.live_status === "idle").length;

  return (
    <div className={embedded ? "space-y-5" : "app-page-wide space-y-5"}>
      {!embedded ? (
        <FadeIn>
          <div className="app-hero-banner">
            <div className="app-hero-glow" aria-hidden />
            <div className="relative">
              <p className="app-section-label text-primary">Attendance</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </FadeIn>
      ) : null}

      <FadeIn delay={40}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 stagger-grid">
          <div className="attendance-kpi">
            <Users className="size-4 text-primary" />
            <div>
              <p className="attendance-kpi__value">{items.length}</p>
              <p className="attendance-kpi__label">Tracked today</p>
            </div>
          </div>
          <div className="attendance-kpi">
            <span className="attendance-status__dot attendance-status__dot--online" />
            <div>
              <p className="attendance-kpi__value">{onlineCount}</p>
              <p className="attendance-kpi__label">Online now</p>
            </div>
          </div>
          <div className="attendance-kpi">
            <span className="attendance-status__dot attendance-status__dot--idle" />
            <div>
              <p className="attendance-kpi__value">{idleCount}</p>
              <p className="attendance-kpi__label">Idle now</p>
            </div>
          </div>
          <div className="attendance-kpi">
            <Clock3 className="size-4 text-primary" />
            <div>
              <p className="attendance-kpi__value">
                {formatAttendanceMinutes(items.reduce((sum, item) => sum + item.active_minutes, 0))}
              </p>
              <p className="attendance-kpi__label">Active time total</p>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={80}>
        <div className="app-surface app-surface--elevated overflow-hidden">
          <div className="border-b border-border/70 p-4">
            <label className="attendance-date-field mb-4 inline-flex">
              <CalendarDays className="size-4 text-primary" />
              <span>Date</span>
              <input
                type="date"
                value={date}
                max={todayInputValue()}
                onChange={(event) => onDateChange(event.target.value)}
                className="attendance-date-field__input"
              />
            </label>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search name, email, ID, or manager…"
              filters={[
                {
                  id: "presence",
                  label: "Status",
                  value: filters.presence ?? "all",
                  options: ATTENDANCE_PRESENCE_FILTER_OPTIONS,
                },
              ]}
              onFilterChange={setFilter}
              onReset={resetFilters}
              showReset={hasActiveFilters}
              resultLabel={`${pagination.total} of ${items.length} people`}
            />
          </div>

          {error ? (
            <div className="p-4">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : null}

          <div className="attendance-list-layout">
            <div className="attendance-list-layout__table">
              <div className="app-table-wrap overflow-x-auto">
                <table className="app-table attendance-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      {showManagerColumn ? <th>Manager</th> : null}
                      <th>Status</th>
                      <th>9 hr target</th>
                      <th>Logged</th>
                      <th>First login</th>
                      <th>Last logout</th>
                      <th>Active</th>
                      <th>Idle</th>
                      <th>Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={showManagerColumn ? 10 : 9} className="py-10 text-center text-sm text-muted-foreground">
                          Loading attendance…
                        </td>
                      </tr>
                    ) : pagination.total === 0 ? (
                      <tr>
                        <td colSpan={showManagerColumn ? 10 : 9} className="py-10 text-center text-sm text-muted-foreground">
                          {items.length === 0
                            ? "No attendance records for this date."
                            : "No people match your search or filters."}
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((item) => (
                        <tr
                          key={item.account_id}
                          className={selectedAccountId === item.account_id ? "attendance-table__row--active" : ""}
                        >
                          <td>
                            <button
                              type="button"
                              className="attendance-table__name-btn"
                              onClick={() => onSelect?.(item)}
                            >
                              <span className="font-medium">{item.name}</span>
                              <span className="block text-xs text-muted-foreground">{item.account_id}</span>
                              <span className="mt-1 block text-[11px] font-medium text-primary">View full logs</span>
                            </button>
                          </td>
                          {showManagerColumn ? <td>{item.manager_name || "—"}</td> : null}
                          <td>
                            <AttendanceStatusBadge status={item.live_status} />
                          </td>
                          <td>
                            <AttendanceTargetCell totalMinutes={item.total_minutes} />
                          </td>
                          <td>{formatAttendanceMinutes(item.total_minutes)}</td>
                          <td>{formatAttendanceTime(item.first_login)}</td>
                          <td>{formatAttendanceTime(item.last_logout)}</td>
                          <td>{formatAttendanceMinutes(item.active_minutes)}</td>
                          <td>{formatAttendanceMinutes(item.idle_minutes)}</td>
                          <td>{item.session_count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!loading && pagination.total > 0 ? (
                <Pagination
                  pagination={pagination}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  label="people"
                />
              ) : null}

              {!selectedAccountId && !loading && pagination.total > 0 ? (
                <div className="attendance-detail-empty attendance-detail-empty--inline">
                  <Clock3 className="size-8 text-primary/70" />
                  <p className="font-medium">Select a {roleLabel.toLowerCase()} to view performance</p>
                  <p className="text-sm text-muted-foreground">
                    Click any row for the same detailed view they see — 9-hour target, session timeline, and activity logs.
                  </p>
                </div>
              ) : null}
            </div>

            {selectedAccountId ? (
              <div className="attendance-list-layout__detail">
                {detailLoading ? (
                  <div className="attendance-page-panel__loading p-6">
                    <div className="attendance-page-panel__skeleton attendance-page-panel__skeleton--wide" />
                    <div className="attendance-page-panel__skeleton-grid">
                      <div className="attendance-page-panel__skeleton" />
                      <div className="attendance-page-panel__skeleton" />
                      <div className="attendance-page-panel__skeleton" />
                      <div className="attendance-page-panel__skeleton" />
                    </div>
                    <div className="attendance-page-panel__skeleton attendance-page-panel__skeleton--tall" />
                  </div>
                ) : detail ? (
                  <AttendancePersonDetailPanel
                    detail={detail}
                    perspective={perspective}
                    roleLabel={roleLabel}
                    activeLabel={activeLabel}
                    idleLabel={idleLabel}
                    onClose={() => onSelect?.(null)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
