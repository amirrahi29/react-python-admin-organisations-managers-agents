"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import { LeaveStatusCell } from "@/components/leaves/leave-status-cell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  isLeaveDateAllowed,
  minLeaveStartDate,
} from "@/lib/leaves/constants";
import { previewLeaveDays, getAgentLeaveRouting, getManagerLeaveRouting } from "@/lib/leaves/client";
import type {
  LeaveDurationType,
  LeavePayload,
  LeavePreviewResponse,
  LeaveRequestRow,
  LeaveRoutingResponse,
  LeaveType,
} from "@/lib/leaves/types";
import {
  LEAVE_DURATION_FILTER_OPTIONS,
  LEAVE_STATUS_FILTER_OPTIONS,
  LEAVE_TYPE_FILTER_OPTIONS,
  filterLeaveRow,
  searchLeaveRow,
} from "@/lib/table/filter-helpers";

type MyLeavesPanelProps = {
  scope: "agent" | "manager";
  items: LeaveRequestRow[];
  loading?: boolean;
  error?: string;
  onRefresh: () => Promise<void> | void;
  onCreate: (payload: LeavePayload) => Promise<void>;
  onUpdate: (id: number, payload: LeavePayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

const LEAVE_TYPES = Object.keys(LEAVE_TYPE_LABELS) as LeaveType[];
const LEAVE_DURATIONS = Object.keys(LEAVE_DURATION_LABELS) as LeaveDurationType[];

function emptyForm(): LeavePayload {
  return {
    start_date: "",
    end_date: "",
    leave_type: "casual",
    duration_type: "full_day",
    reason: "",
  };
}

export function MyLeavesPanel({
  scope,
  items,
  loading = false,
  error = "",
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}: MyLeavesPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LeavePayload>(emptyForm);
  const [preview, setPreview] = useState<LeavePreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequestRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [routing, setRouting] = useState<LeaveRoutingResponse | null>(null);
  const [routingError, setRoutingError] = useState("");

  const minStartDate = minLeaveStartDate();
  const isHalfDay = form.duration_type === "half_day";

  const pendingCount = useMemo(() => items.filter((item) => item.status === "pending").length, [items]);
  const approvedDays = useMemo(
    () => items.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.working_days, 0),
    [items],
  );

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

  useEffect(() => {
    const loadRouting = scope === "agent" ? getAgentLeaveRouting : getManagerLeaveRouting;
    void loadRouting()
      .then((data) => {
        setRouting(data);
        setRoutingError("");
      })
      .catch((err) => {
        setRouting(null);
        setRoutingError(err instanceof Error ? err.message : "Unable to load approver details.");
      });
  }, [scope]);

  useEffect(() => {
    if (!form.start_date || !form.end_date || form.end_date < form.start_date) {
      setPreview(null);
      setPreviewError("");
      return;
    }
    if (!isLeaveDateAllowed(form.start_date) || !isLeaveDateAllowed(form.end_date)) {
      setPreview(null);
      setPreviewError("Leave can only be applied for future dates. Today and past dates are not allowed.");
      return;
    }

    const timer = window.setTimeout(() => {
      void previewLeaveDays(scope, form.start_date, form.end_date, form.duration_type)
        .then((data) => {
          setPreview(data);
          setPreviewError("");
        })
        .catch((err) => {
          setPreview(null);
          setPreviewError(err instanceof Error ? err.message : "Unable to preview leave days.");
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [form.start_date, form.end_date, form.duration_type, scope]);

  const resetForm = useCallback(() => {
    setForm(emptyForm());
    setEditingId(null);
    setPreview(null);
    setPreviewError("");
    setFormError("");
    setShowForm(false);
  }, []);

  function startEdit(item: LeaveRequestRow) {
    setEditingId(item.id);
    setForm({
      start_date: item.start_date,
      end_date: item.end_date,
      leave_type: item.leave_type,
      duration_type: item.duration_type ?? "full_day",
      reason: item.reason,
    });
    setShowForm(true);
    setFormError("");
  }

  function updateDurationType(durationType: LeaveDurationType) {
    setForm((current) => {
      const next = { ...current, duration_type: durationType };
      if (durationType === "half_day" && next.start_date) {
        next.end_date = next.start_date;
      }
      return next;
    });
  }

  function updateStartDate(startDate: string) {
    setForm((current) => {
      const next = { ...current, start_date: startDate };
      if (current.duration_type === "half_day") {
        next.end_date = startDate;
      } else if (next.end_date && next.end_date < startDate) {
        next.end_date = startDate;
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      setFormError("All fields are required.");
      return;
    }
    if (!isLeaveDateAllowed(form.start_date) || !isLeaveDateAllowed(form.end_date)) {
      setFormError("Leave can only be applied for future dates. Today and past dates are not allowed.");
      return;
    }
    if (isHalfDay && form.start_date !== form.end_date) {
      setFormError("Half-day leave must be for one date only.");
      return;
    }
    if (!preview || preview.working_days <= 0) {
      setFormError(
        isHalfDay
          ? "Half-day leave must be on a working day (Mon–Fri)."
          : "Leave must include at least one working day (Mon–Fri). Weekends are excluded.",
      );
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      if (editingId) {
        await onUpdate(editingId, form);
      } else {
        await onCreate(form);
      }
      resetForm();
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to delete leave request.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 stagger-grid">
        <div className="attendance-kpi">
          <CalendarRange className="size-4 text-primary" />
          <div>
            <p className="attendance-kpi__value">{items.length}</p>
            <p className="attendance-kpi__label">Total requests</p>
          </div>
        </div>
        <div className="attendance-kpi">
          <span className="leave-status leave-status--pending">Pending</span>
          <div>
            <p className="attendance-kpi__value">{pendingCount}</p>
            <p className="attendance-kpi__label">Awaiting approval</p>
          </div>
        </div>
        <div className="attendance-kpi">
          <CalendarRange className="size-4 text-primary" />
          <div>
            <p className="attendance-kpi__value">{approvedDays}</p>
            <p className="attendance-kpi__label">Approved working days</p>
          </div>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {routingError ? <Alert variant="error">{routingError}</Alert> : null}
      {formError && !showForm ? <Alert variant="error">{formError}</Alert> : null}

      <div className="app-surface app-surface--elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-4">
          <div>
            <h2 className="font-semibold">My leave requests</h2>
            <p className="text-sm text-muted-foreground">
              {scope === "agent"
                ? routing
                  ? `Your leave requests are sent to your manager: ${routing.approver_name}.`
                  : "Apply for leave — your assigned manager will approve or decline."
                : routing
                  ? `Your leave requests are sent to admin: ${routing.approver_name}.`
                  : "Apply for leave — admin will approve or decline."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Leave can only be applied from tomorrow onwards. Choose full day or half day.
            </p>
          </div>
          {!showForm ? (
            <Button className="h-10" onClick={() => setShowForm(true)} disabled={Boolean(routingError)}>
              <Plus className="size-4" />
              Apply leave
            </Button>
          ) : null}
        </div>

        {showForm ? (
          <div className="border-b border-border/70 p-4 sm:p-5">
            <p className="mb-4 text-sm font-medium">{editingId ? "Edit leave request" : "New leave request"}</p>
            {routing ? (
              <div className="leave-preview mb-4">
                <p className="text-sm">
                  {scope === "agent" ? "Sent to your manager" : "Sent to admin"}:{" "}
                  <strong>{routing.approver_name}</strong>
                  {routing.approver_email ? (
                    <span className="text-muted-foreground"> ({routing.approver_email})</span>
                  ) : null}
                </p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Duration" htmlFor="leave-duration" required>
                <select
                  id="leave-duration"
                  className="app-input"
                  value={form.duration_type}
                  onChange={(event) => updateDurationType(event.target.value as LeaveDurationType)}
                >
                  {LEAVE_DURATIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {LEAVE_DURATION_LABELS[duration]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Leave type" htmlFor="leave-type" required>
                <select
                  id="leave-type"
                  className="app-input"
                  value={form.leave_type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, leave_type: event.target.value as LeaveType }))
                  }
                >
                  {LEAVE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {LEAVE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={isHalfDay ? "Leave date" : "Start date"} htmlFor="leave-start" required>
                <input
                  id="leave-start"
                  type="date"
                  className="app-input"
                  min={minStartDate}
                  value={form.start_date}
                  onChange={(event) => updateStartDate(event.target.value)}
                />
              </FormField>
              {!isHalfDay ? (
                <FormField label="End date" htmlFor="leave-end" required>
                  <input
                    id="leave-end"
                    type="date"
                    className="app-input"
                    min={form.start_date && form.start_date > minStartDate ? form.start_date : minStartDate}
                    value={form.end_date}
                    onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
                  />
                </FormField>
              ) : (
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                  Half-day leave applies to the selected date only.
                </div>
              )}
              <div className="sm:col-span-2">
                <FormField label="Reason" htmlFor="leave-reason" required>
                  <textarea
                    id="leave-reason"
                    className="app-input min-h-24 resize-y"
                    value={form.reason}
                    onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                    placeholder="Brief reason for your leave request"
                  />
                </FormField>
              </div>
            </div>

            {preview ? (
              <div className="leave-preview mt-4">
                <p>
                  <strong>{formatWorkingDays(preview.working_days, form.duration_type)}</strong>
                  {form.duration_type === "full_day" ? (
                    <>
                      {" "}
                      · {preview.calendar_days} calendar day{preview.calendar_days === 1 ? "" : "s"}
                      {preview.weekend_days > 0 ? ` · ${preview.weekend_days} weekend day(s) excluded` : ""}
                    </>
                  ) : null}
                </p>
                {formatWeekendNote(preview.weekend_dates) ? (
                  <p className="mt-1 text-xs text-muted-foreground">{formatWeekendNote(preview.weekend_dates)}</p>
                ) : null}
              </div>
            ) : null}
            {previewError ? <p className="mt-3 text-sm text-destructive">{previewError}</p> : null}
            {formError ? <p className="mt-3 text-sm text-destructive">{formError}</p> : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="h-10" loading={submitting} onClick={() => void handleSubmit()}>
                {editingId ? "Save changes" : "Submit request"}
              </Button>
              <Button variant="secondary" className="h-10" disabled={submitting} onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="border-b border-border/70 px-4 pb-4">
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search dates, type, status, or reason…"
              filters={[
                {
                  id: "status",
                  label: "Status",
                  value: filters.status ?? "all",
                  options: LEAVE_STATUS_FILTER_OPTIONS,
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
              resultLabel={`${pagination.total} of ${items.length} requests`}
            />
          </div>
        ) : null}

        <div className="app-table-wrap overflow-x-auto">
          <table className="app-table leave-table">
            <thead>
              <tr>
                <th>Dates</th>
                <th>Duration</th>
                <th>Type</th>
                <th>Days</th>
                <th>Status</th>
                <th>Sent to</th>
                <th>Reason</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Loading leave requests…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No leave requests yet. Apply for your first leave above.
                  </td>
                </tr>
              ) : pagination.total === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No leave requests match your search or filters.
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="font-medium">{formatLeaveDateRange(item.start_date, item.end_date)}</span>
                      {item.weekend_days > 0 ? (
                        <span className="block text-xs text-muted-foreground">
                          {formatWorkingDays(item.working_days, item.duration_type)} · {item.weekend_days} weekend
                          excluded
                        </span>
                      ) : null}
                    </td>
                    <td>{LEAVE_DURATION_LABELS[item.duration_type ?? "full_day"]}</td>
                    <td>{LEAVE_TYPE_LABELS[item.leave_type]}</td>
                    <td>{formatWorkingDays(item.working_days, item.duration_type)}</td>
                    <td>
                      <LeaveStatusCell
                        status={item.status}
                        reviewNote={item.review_note}
                        reviewedAt={item.reviewed_at}
                        reviewerName={item.assigned_reviewer_name ?? routing?.approver_name}
                      />
                    </td>
                    <td className="text-sm">
                      {item.assigned_reviewer_name ?? routing?.approver_name ?? "—"}
                    </td>
                    <td className="max-w-xs truncate">{item.reason}</td>
                    <td>
                      {item.can_edit || item.can_delete ? (
                        <div className="flex items-center gap-1">
                          {item.can_edit ? (
                            <button
                              type="button"
                              className="leave-action-btn"
                              aria-label="Edit leave"
                              onClick={() => startEdit(item)}
                            >
                              <Pencil className="size-4" />
                            </button>
                          ) : null}
                          {item.can_delete ? (
                            <button
                              type="button"
                              className="leave-action-btn leave-action-btn--danger"
                              aria-label="Delete leave"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          ) : null}
                        </div>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete leave request?"
        description={
          deleteTarget
            ? `Remove your pending leave for ${formatLeaveDateRange(deleteTarget.start_date, deleteTarget.end_date)}?`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>
  );
}
