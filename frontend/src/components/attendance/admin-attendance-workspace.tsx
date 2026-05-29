"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminAttendancePage } from "@/components/attendance/admin-attendance-page";
import { LeaveApprovalsPanel } from "@/components/leaves/leave-approvals-panel";
import { LeaveReviewHistoryPanel } from "@/components/leaves/leave-review-history-panel";
import { AppTabBar } from "@/components/ui/app-tab-bar";
import {
  approveManagerLeave,
  declineManagerLeave,
  getAdminAgentLeaves,
  getAdminManagerLeaveHistory,
  getAdminPendingLeaves,
} from "@/lib/leaves/client";
import type { LeaveRequestRow } from "@/lib/leaves/types";

export function AdminAttendanceWorkspace() {
  const [tab, setTab] = useState("attendance");
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequestRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    setPendingError("");
    try {
      const response = await getAdminPendingLeaves();
      setPendingLeaves(response.items);
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : "Unable to load pending leaves.");
      setPendingLeaves([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  return (
    <div className="space-y-4">
      <AppTabBar
        active={tab}
        onChange={setTab}
        ariaLabel="Admin attendance workspace"
        tabs={[
          { id: "attendance", label: "Attendance" },
          { id: "manager-approvals", label: "Manager approvals", count: pendingLeaves.length || undefined },
          { id: "agent-leaves", label: "Agent leaves" },
        ]}
      />

      {tab === "attendance" ? <AdminAttendancePage embedded /> : null}

      {tab === "manager-approvals" ? (
        <div className="leave-workspace-stack">
          <LeaveApprovalsPanel
            embedded
            title="Needs your action"
            subtitle="Approve or decline manager leave requests in your organization."
            items={pendingLeaves}
            loading={pendingLoading}
            error={pendingError}
            onApprove={async (id, note) => {
              await approveManagerLeave(id, note);
              await loadPending();
              setHistoryRefreshKey((value) => value + 1);
            }}
            onDecline={async (id, note) => {
              await declineManagerLeave(id, note);
              await loadPending();
              setHistoryRefreshKey((value) => value + 1);
            }}
          />
          <LeaveReviewHistoryPanel
            embedded
            excludePending
            title="Review history"
            subtitle="Approved and declined manager leaves — filter by month to track leave taken."
            employeeLabel="Manager"
            loadHistory={getAdminManagerLeaveHistory}
            refreshKey={historyRefreshKey}
          />
        </div>
      ) : null}

      {tab === "agent-leaves" ? (
        <div className="space-y-5">
          <div className="app-hero-banner">
            <div className="app-hero-glow" aria-hidden />
            <div className="relative">
              <p className="app-section-label text-primary">Organization leaves</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">Agent leave history</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                All agent leave requests across your organization — approved, pending, and declined — with monthly totals.
              </p>
            </div>
          </div>
          <LeaveReviewHistoryPanel
            title="All agent leaves"
            subtitle="Organization-wide agent leave records. Filter by month to see how much leave was taken."
            employeeLabel="Agent"
            showManagerColumn
            loadHistory={getAdminAgentLeaves}
          />
        </div>
      ) : null}
    </div>
  );
}
