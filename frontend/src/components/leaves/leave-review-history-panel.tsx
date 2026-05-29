"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import { LeaveStatusCell } from "@/components/leaves/leave-status-cell";
import { Alert } from "@/components/ui/alert";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { useClientTable } from "@/hooks/use-client-table";
import {
  LEAVE_DURATION_LABELS,
  LEAVE_TYPE_LABELS,
  currentLeaveMonth,
  formatLeaveDateRange,
  formatLeaveMonthLabel,
  formatReviewedAt,
  formatWorkingDays,
} from "@/lib/leaves/constants";
import type { LeaveHistoryResponse } from "@/lib/leaves/types";
import {
  LEAVE_DURATION_FILTER_OPTIONS,
  LEAVE_STATUS_FILTER_OPTIONS,
  LEAVE_TYPE_FILTER_OPTIONS,
  filterLeaveRow,
  searchLeaveRow,
} from "@/lib/table/filter-helpers";

type LeaveReviewHistoryPanelProps = {
  title: string;
  subtitle: string;
  employeeLabel: string;
  showManagerColumn?: boolean;
  embedded?: boolean;
  excludePending?: boolean;
  loadHistory: (month: string) => Promise<LeaveHistoryResponse>;
  refreshKey?: number;
};

export function LeaveReviewHistoryPanel({
  title,
  subtitle,
  employeeLabel,
  showManagerColumn = false,
  embedded = false,
  excludePending = false,
  loadHistory,
  refreshKey = 0,
}: LeaveReviewHistoryPanelProps) {
  const [month, setMonth] = useState(currentLeaveMonth);
  const [data, setData] = useState<LeaveHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await loadHistory(month);
      setData(response);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Unable to load leave history.");
    } finally {
      setLoading(false);
    }
  }, [loadHistory, month]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const summary = data?.summary;
  const visibleItems = useMemo(
    () =>
      excludePending
        ? (data?.items ?? []).filter((item) => item.status !== "pending")
        : (data?.items ?? []),
    [data?.items, excludePending],
  );
  const pendingInMonth = summary?.pending ?? 0;

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
    items: visibleItems,
    pageSize: 10,
    searchFn: searchLeaveRow,
    filterFn: filterLeaveRow,
  });

  return (
    <section className={embedded ? "leave-workspace-section leave-workspace-section--history" : "space-y-4"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {embedded ? (
            <>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </>
          )}
        </div>
        <label className="attendance-date-field">
          <CalendarRange className="size-4 text-primary" />
          <span>Month</span>
          <input
            type="month"
            value={month}
            max={currentLeaveMonth()}
            onChange={(event) => setMonth(event.target.value)}
            className="attendance-date-field__input"
          />
        </label>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {excludePending && pendingInMonth > 0 && !loading ? (
        <p className="leave-workspace-section__hint">
          {pendingInMonth} request{pendingInMonth === 1 ? "" : "s"} still pending — review them in the section above.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 stagger-grid">
        <div className="attendance-kpi">
          <CalendarRange className="size-4 text-primary" />
          <div>
            <p className="attendance-kpi__value">{summary?.total ?? (loading ? "…" : 0)}</p>
            <p className="attendance-kpi__label">Requests in {formatLeaveMonthLabel(month)}</p>
          </div>
        </div>
        <div className="attendance-kpi">
          <span className="leave-status leave-status--approved">Approved</span>
          <div>
            <p className="attendance-kpi__value">{summary?.approved ?? (loading ? "…" : 0)}</p>
            <p className="attendance-kpi__label">Approved leaves</p>
          </div>
        </div>
        <div className="attendance-kpi">
          <span className="leave-status leave-status--pending">Pending</span>
          <div>
            <p className="attendance-kpi__value">{summary?.pending ?? (loading ? "…" : 0)}</p>
            <p className="attendance-kpi__label">Still pending</p>
          </div>
        </div>
        <div className="attendance-kpi">
          <CalendarRange className="size-4 text-primary" />
          <div>
            <p className="attendance-kpi__value attendance-kpi__value--text">
              {summary ? `${summary.approved_working_days} working days` : loading ? "Loading…" : "0 working days"}
            </p>
            <p className="attendance-kpi__label">Approved leave this month</p>
          </div>
        </div>
      </div>

      <div className="app-surface app-surface--elevated overflow-hidden">
        {visibleItems.length > 0 ? (
          <div className="border-b border-border/70 p-4">
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search employee, reason, or dates…"
              filters={[
                {
                  id: "status",
                  label: "Status",
                  value: filters.status ?? "all",
                  options: excludePending
                    ? LEAVE_STATUS_FILTER_OPTIONS.filter((option) => option.value !== "pending")
                    : LEAVE_STATUS_FILTER_OPTIONS,
                },
                {
                  id: "type",
                  label: "Type",
                  value: filters.type ?? "all",
                  options: LEAVE_TYPE_FILTER_OPTIONS,
                },
                {
                  id: "duration",
                  label: "Duration",
                  value: filters.duration ?? "all",
                  options: LEAVE_DURATION_FILTER_OPTIONS,
                },
              ]}
              onFilterChange={setFilter}
              onReset={resetFilters}
              showReset={hasActiveFilters}
              resultLabel={`${pagination.total} of ${visibleItems.length} records`}
            />
          </div>
        ) : null}
        <div className="app-table-wrap overflow-x-auto">
          <table className="app-table leave-table">
            <thead>
              <tr>
                <th>{employeeLabel}</th>
                {showManagerColumn ? <th>Manager</th> : null}
                <th>Dates</th>
                <th>Duration</th>
                <th>Type</th>
                <th>Days</th>
                <th>Status</th>
                <th>Reviewed</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={showManagerColumn ? 9 : 8} className="py-10 text-center text-sm text-muted-foreground">
                    Loading leave history…
                  </td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={showManagerColumn ? 9 : 8} className="py-10 text-center">
                    <p className="text-sm font-medium text-foreground">
                      {excludePending
                        ? `No completed reviews for ${formatLeaveMonthLabel(month)}`
                        : `No leave requests for ${formatLeaveMonthLabel(month)}`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {excludePending && pendingInMonth > 0
                        ? "Pending requests are listed in the approvals section above."
                        : "Try selecting a different month."}
                    </p>
                  </td>
                </tr>
              ) : pagination.total === 0 ? (
                <tr>
                  <td colSpan={showManagerColumn ? 9 : 8} className="py-10 text-center">
                    <p className="text-sm font-medium text-foreground">No matching records</p>
                    <p className="mt-1 text-sm text-muted-foreground">Try changing your search or filters.</p>
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="font-medium">{item.requester_name}</span>
                      <span className="block text-xs text-muted-foreground">{item.requester_email}</span>
                    </td>
                    {showManagerColumn ? <td>{item.manager_name || "—"}</td> : null}
                    <td>{formatLeaveDateRange(item.start_date, item.end_date)}</td>
                    <td>{LEAVE_DURATION_LABELS[item.duration_type ?? "full_day"]}</td>
                    <td>{LEAVE_TYPE_LABELS[item.leave_type]}</td>
                    <td>{formatWorkingDays(item.working_days, item.duration_type)}</td>
                    <td>
                      <LeaveStatusCell
                        status={item.status}
                        reviewNote={item.review_note}
                        reviewedAt={item.reviewed_at}
                        reviewerName={item.assigned_reviewer_name}
                        showReviewedTime={false}
                        variant="compact"
                      />
                    </td>
                    <td className="text-sm">{formatReviewedAt(item.reviewed_at)}</td>
                    <td className="max-w-xs truncate">{item.reason}</td>
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
            label="records"
          />
        ) : null}
      </div>
    </section>
  );
}
