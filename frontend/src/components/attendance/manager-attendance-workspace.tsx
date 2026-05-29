"use client";

import { useCallback, useEffect, useState } from "react";
import { AttendanceListPage } from "@/components/attendance/attendance-list-page";
import { SelfAttendancePanel } from "@/components/attendance/self-attendance-panel";
import { LeaveApprovalsPanel } from "@/components/leaves/leave-approvals-panel";
import { LeaveReviewHistoryPanel } from "@/components/leaves/leave-review-history-panel";
import { MyLeavesPanel } from "@/components/leaves/my-leaves-panel";
import { AppTabBar } from "@/components/ui/app-tab-bar";
import { useAttendanceLivePoll, isAttendanceToday } from "@/hooks/use-attendance-live-poll";
import {
  getManagerAgentAttendance,
  getManagerSelfAttendance,
  getManagerTeamAttendance,
} from "@/lib/attendance/client";
import type { AttendanceDetailResponse, AttendanceSummaryRow } from "@/lib/attendance/types";
import {
  approveAgentLeave,
  createManagerLeave,
  declineAgentLeave,
  deleteManagerLeave,
  getManagerAgentLeaveHistory,
  getManagerLeaves,
  getManagerPendingLeaves,
  updateManagerLeave,
} from "@/lib/leaves/client";
import type { LeaveRequestRow } from "@/lib/leaves/types";

export function ManagerAttendanceWorkspace() {
  const [tab, setTab] = useState("self");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<AttendanceSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AttendanceSummaryRow | null>(null);
  const [detail, setDetail] = useState<AttendanceDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [leaves, setLeaves] = useState<LeaveRequestRow[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leavesError, setLeavesError] = useState("");
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequestRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getManagerTeamAttendance(date);
      setItems(response.items);
      setSelected((current) =>
        current ? response.items.find((item) => item.account_id === current.account_id) ?? null : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load attendance.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadLeaves = useCallback(async () => {
    setLeavesLoading(true);
    setLeavesError("");
    try {
      const response = await getManagerLeaves();
      setLeaves(response.items);
    } catch (err) {
      setLeavesError(err instanceof Error ? err.message : "Unable to load leave requests.");
      setLeaves([]);
    } finally {
      setLeavesLoading(false);
    }
  }, []);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    setPendingError("");
    try {
      const response = await getManagerPendingLeaves();
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

  useEffect(() => {
    if (tab === "team") void loadTeam();
  }, [tab, loadTeam]);

  useEffect(() => {
    if (tab === "leaves") void loadLeaves();
  }, [tab, loadLeaves]);

  useEffect(() => {
    if (tab !== "team" || !selected) {
      setDetail(null);
      return;
    }

    setDetailLoading(true);
    void getManagerAgentAttendance(selected.account_id, date)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selected, date, tab]);

  const refreshTeamLive = useCallback(() => {
    if (tab !== "team") return;
    void getManagerTeamAttendance(date)
      .then((response) => {
        setItems(response.items);
        setSelected((current) =>
          current ? response.items.find((item) => item.account_id === current.account_id) ?? null : null,
        );
      })
      .catch(() => {
        // keep last snapshot
      });
    if (selected) {
      void getManagerAgentAttendance(selected.account_id, date)
        .then(setDetail)
        .catch(() => {
          // keep last snapshot
        });
    }
  }, [date, selected, tab]);

  useAttendanceLivePoll(tab === "team" && isAttendanceToday(date), refreshTeamLive);

  return (
    <div className="space-y-4">
      <AppTabBar
        active={tab}
        onChange={setTab}
        ariaLabel="Manager attendance workspace"
        tabs={[
          { id: "self", label: "My attendance" },
          { id: "team", label: "Team attendance" },
          { id: "leaves", label: "My leaves" },
          { id: "approvals", label: "Agent approvals", count: pendingLeaves.length || undefined },
        ]}
      />

      {tab === "self" ? (
        <SelfAttendancePanel loadDetail={getManagerSelfAttendance} pollEnabled />
      ) : null}

      {tab === "team" ? (
        <AttendanceListPage
          embedded
          title="Team attendance"
          subtitle="Track agent performance — 9-hour target, login/logout logs, idle time, and live status."
          items={items}
          date={date}
          loading={loading}
          error={error}
          onDateChange={setDate}
          onSelect={setSelected}
          selectedAccountId={selected?.account_id ?? null}
          detail={detail}
          detailLoading={detailLoading}
          roleLabel="Agent"
          perspective="review"
          activeLabel="Working"
          idleLabel="Away"
        />
      ) : null}

      {tab === "leaves" ? (
        <MyLeavesPanel
          scope="manager"
          items={leaves}
          loading={leavesLoading}
          error={leavesError}
          onRefresh={loadLeaves}
          onCreate={async (payload) => {
            await createManagerLeave(payload);
          }}
          onUpdate={async (id, payload) => {
            await updateManagerLeave(id, payload);
          }}
          onDelete={async (id) => {
            await deleteManagerLeave(id);
          }}
        />
      ) : null}

      {tab === "approvals" ? (
        <div className="leave-workspace-stack">
          <LeaveApprovalsPanel
            embedded
            title="Needs your action"
            subtitle="Approve or decline agent leave requests assigned to you."
            items={pendingLeaves}
            loading={pendingLoading}
            error={pendingError}
            onApprove={async (id, note) => {
              await approveAgentLeave(id, note);
              await loadPending();
              setHistoryRefreshKey((value) => value + 1);
            }}
            onDecline={async (id, note) => {
              await declineAgentLeave(id, note);
              await loadPending();
              setHistoryRefreshKey((value) => value + 1);
            }}
          />
          <LeaveReviewHistoryPanel
            embedded
            excludePending
            title="Review history"
            subtitle="Approved and declined agent leaves — filter by month to track leave taken."
            employeeLabel="Agent"
            loadHistory={getManagerAgentLeaveHistory}
            refreshKey={historyRefreshKey}
          />
        </div>
      ) : null}
    </div>
  );
}
