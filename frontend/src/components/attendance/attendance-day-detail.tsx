"use client";

import { useMemo, useState } from "react";
import { ChevronDown, History } from "lucide-react";
import { AttendanceDaySummary } from "@/components/attendance/attendance-day-summary";
import { AttendanceSessionCard } from "@/components/attendance/attendance-session-card";
import { AttendanceWorkTargetCard } from "@/components/attendance/attendance-work-target-card";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { useClientTable } from "@/hooks/use-client-table";
import {
  describeSessionDuration,
  formatAttendanceTime,
} from "@/lib/attendance/constants";
import type { AttendanceDetailResponse, AttendanceSessionRow } from "@/lib/attendance/types";
import type { AttendanceViewPerspective } from "@/lib/attendance/constants";

type AttendanceDayDetailProps = {
  detail: AttendanceDetailResponse;
  emptyMessage?: string;
  activeLabel?: string;
  idleLabel?: string;
  showSummary?: boolean;
  showWorkTarget?: boolean;
  enableSessionFilters?: boolean;
  sessionHistoryDefaultOpen?: boolean;
  perspective?: AttendanceViewPerspective;
  subjectName?: string;
};

type SessionSort = "newest" | "oldest";

function sessionSearchFn(session: AttendanceSessionRow, query: string) {
  const haystack = [
    formatAttendanceTime(session.login_at),
    formatAttendanceTime(session.logout_at),
    session.status,
    describeSessionDuration(session.login_at, session.logout_at, !session.logout_at),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function sessionFilterFn(session: AttendanceSessionRow, filters: Record<string, string>) {
  if (filters.status === "live") return !session.logout_at;
  if (filters.status === "completed") return Boolean(session.logout_at);
  return true;
}

export function AttendanceDayDetail({
  detail,
  emptyMessage = "No sessions recorded for this date.",
  activeLabel,
  idleLabel,
  showSummary = true,
  showWorkTarget = true,
  enableSessionFilters = true,
  sessionHistoryDefaultOpen = false,
  perspective = "self",
  subjectName,
}: AttendanceDayDetailProps) {
  const [sessionHistoryOpen, setSessionHistoryOpen] = useState(sessionHistoryDefaultOpen);
  const [sortOrder, setSortOrder] = useState<SessionSort>("newest");

  const sortedSessions = useMemo(() => {
    const copy = [...detail.sessions];
    if (sortOrder === "oldest") {
      copy.reverse();
    }
    return copy;
  }, [detail.sessions, sortOrder]);

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
    items: sortedSessions,
    pageSize: 5,
    searchFn: sessionSearchFn,
    filterFn: sessionFilterFn,
  });

  const sessionIndexById = useMemo(() => {
    const ordered = [...detail.sessions].sort(
      (a, b) => new Date(a.login_at).getTime() - new Date(b.login_at).getTime(),
    );
    return new Map(ordered.map((session, index) => [session.session_id, index]));
  }, [detail.sessions]);

  return (
    <div className="attendance-day-detail">
      {showWorkTarget ? (
        <AttendanceWorkTargetCard
          detail={detail}
          perspective={perspective}
          subjectName={subjectName ?? detail.name ?? undefined}
        />
      ) : null}
      {showSummary ? <AttendanceDaySummary detail={detail} /> : null}

      <section className="attendance-session-list">
        <button
          type="button"
          className="attendance-session-list__toggle"
          onClick={() => setSessionHistoryOpen((open) => !open)}
          aria-expanded={sessionHistoryOpen}
        >
          <div className="attendance-session-list__head">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" aria-hidden />
              <div className="text-left">
                <h2 className="attendance-session-list__title">Session history</h2>
                <p className="attendance-session-list__subtitle">Login, logout, and activity events</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="attendance-session-list__count">{detail.sessions.length}</span>
              <ChevronDown
                className={`attendance-session-list__chevron size-4 text-muted-foreground transition-transform ${
                  sessionHistoryOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </div>
          </div>
        </button>

        {sessionHistoryOpen ? (
          <>
        {enableSessionFilters && detail.sessions.length > 0 ? (
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by time, status, or duration…"
            filters={[
              {
                id: "status",
                label: "Status",
                value: filters.status ?? "all",
                options: [
                  { value: "all", label: "All sessions" },
                  { value: "live", label: "Live / open" },
                  { value: "completed", label: "Completed" },
                ],
              },
              {
                id: "sort",
                label: "Sort",
                value: sortOrder,
                options: [
                  { value: "newest", label: "Newest first" },
                  { value: "oldest", label: "Oldest first" },
                ],
              },
            ]}
            onFilterChange={(id, value) => {
              if (id === "sort") {
                setSortOrder(value as SessionSort);
                return;
              }
              setFilter(id, value);
            }}
            onReset={() => {
              resetFilters();
              setSortOrder("newest");
            }}
            showReset={hasActiveFilters || sortOrder !== "newest"}
            resultLabel={`${pagination.total} of ${detail.sessions.length} sessions`}
          />
        ) : null}

        {detail.sessions.length === 0 ? (
          <div className="attendance-detail-empty">
            <History className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium text-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : pagination.total === 0 ? (
          <div className="attendance-detail-empty">
            <History className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium text-foreground">No matching sessions</p>
            <p className="text-sm text-muted-foreground">Try changing filters or reset your search.</p>
          </div>
        ) : (
          <>
            <div className="attendance-session-list__items">
              {pageItems.map((session) => (
                <AttendanceSessionCard
                  key={session.session_id}
                  session={session}
                  index={sessionIndexById.get(session.session_id) ?? 0}
                  activeLabel={activeLabel}
                  idleLabel={idleLabel}
                />
              ))}
            </div>
            {pagination.total > pagination.page_size ? (
              <Pagination
                pagination={pagination}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                label="sessions"
              />
            ) : null}
          </>
        )}
          </>
        ) : null}
      </section>
    </div>
  );
}
