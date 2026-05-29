"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { useClientTable } from "@/hooks/use-client-table";
import {
  LEAVE_DURATION_LABELS,
  LEAVE_TYPE_LABELS,
  formatLeaveDateRange,
  formatWeekendNote,
  formatWorkingDays,
} from "@/lib/leaves/constants";
import type { LeaveRequestRow } from "@/lib/leaves/types";
import {
  LEAVE_DURATION_FILTER_OPTIONS,
  LEAVE_TYPE_FILTER_OPTIONS,
  filterLeaveRow,
  searchLeaveRow,
} from "@/lib/table/filter-helpers";

type LeaveApprovalsPanelProps = {
  title: string;
  subtitle: string;
  items: LeaveRequestRow[];
  loading?: boolean;
  error?: string;
  embedded?: boolean;
  showManagerColumn?: boolean;
  onApprove: (id: number, reviewNote?: string) => Promise<void>;
  onDecline: (id: number, reviewNote?: string) => Promise<void>;
};

export function LeaveApprovalsPanel({
  title,
  subtitle,
  items,
  loading = false,
  error = "",
  embedded = false,
  showManagerColumn = false,
  onApprove,
  onDecline,
}: LeaveApprovalsPanelProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

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
    searchFn: searchLeaveRow,
    filterFn: filterLeaveRow,
  });

  async function handleAction(id: number, approve: boolean) {
    setBusy(true);
    setActionError("");
    try {
      if (approve) {
        await onApprove(id, reviewNote.trim() || undefined);
      } else {
        await onDecline(id, reviewNote.trim() || undefined);
      }
      setActiveId(null);
      setReviewNote("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update leave request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={embedded ? "leave-workspace-section" : "space-y-5"}>
      {embedded ? (
        <div className="leave-workspace-section__head">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              {!loading ? (
                <span className="leave-workspace-section__count">{items.length} pending</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      ) : (
        <div className="app-hero-banner">
          <div className="app-hero-glow" aria-hidden />
          <div className="relative">
            <p className="app-section-label text-primary">Leave approvals</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      )}

      {error ? <Alert variant="error">{error}</Alert> : null}
      {actionError ? <Alert variant="error">{actionError}</Alert> : null}

      <div className="app-surface app-surface--elevated overflow-hidden">
        {items.length > 0 ? (
          <div className="border-b border-border/70 p-4">
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search employee, reason, or dates…"
              filters={[
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
              resultLabel={`${pagination.total} of ${items.length} pending`}
            />
          </div>
        ) : null}
        <div className="app-table-wrap overflow-x-auto">
          <table className="app-table leave-table">
            <thead>
              <tr>
                <th>Employee</th>
                {showManagerColumn ? <th>Manager</th> : null}
                <th>Dates</th>
                <th>Duration</th>
                <th>Type</th>
                <th>Days</th>
                <th>Reason</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={showManagerColumn ? 8 : 7} className="py-10 text-center text-sm text-muted-foreground">
                    Loading pending requests…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={showManagerColumn ? 8 : 7} className="py-10 text-center">
                    <p className="text-sm font-medium text-foreground">All caught up</p>
                    <p className="mt-1 text-sm text-muted-foreground">No leave requests waiting for your review.</p>
                  </td>
                </tr>
              ) : pagination.total === 0 ? (
                <tr>
                  <td colSpan={showManagerColumn ? 8 : 7} className="py-10 text-center">
                    <p className="text-sm font-medium text-foreground">No matching requests</p>
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
                    <td>
                      <span>{formatLeaveDateRange(item.start_date, item.end_date)}</span>
                      {item.weekend_days > 0 ? (
                        <span className="block text-xs text-muted-foreground">
                          {item.working_days} working · {item.weekend_days} weekend excluded
                        </span>
                      ) : null}
                      {formatWeekendNote(item.weekend_dates) ? (
                        <span className="block text-xs text-muted-foreground">{formatWeekendNote(item.weekend_dates)}</span>
                      ) : null}
                    </td>
                    <td>{LEAVE_DURATION_LABELS[item.duration_type ?? "full_day"]}</td>
                    <td>{LEAVE_TYPE_LABELS[item.leave_type]}</td>
                    <td>{formatWorkingDays(item.working_days, item.duration_type)}</td>
                    <td className="max-w-xs">{item.reason}</td>
                    <td>
                      {item.status === "pending" ? (
                        activeId === item.id ? (
                          <div className="leave-review-box">
                            <FormField label="Note (optional)" htmlFor={`review-${item.id}`}>
                              <input
                                id={`review-${item.id}`}
                                className="app-input"
                                value={reviewNote}
                                onChange={(event) => setReviewNote(event.target.value)}
                                placeholder="Optional message"
                              />
                            </FormField>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                className="h-9"
                                loading={busy}
                                onClick={() => void handleAction(item.id, true)}
                              >
                                <Check className="size-4" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                className="h-9"
                                loading={busy}
                                onClick={() => void handleAction(item.id, false)}
                              >
                                <X className="size-4" />
                                Decline
                              </Button>
                              <Button
                                variant="secondary"
                                className="h-9"
                                disabled={busy}
                                onClick={() => {
                                  setActiveId(null);
                                  setReviewNote("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="secondary" className="h-9" onClick={() => setActiveId(item.id)}>
                            Review
                          </Button>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
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
            label="requests"
          />
        ) : null}
      </div>
    </section>
  );
}
