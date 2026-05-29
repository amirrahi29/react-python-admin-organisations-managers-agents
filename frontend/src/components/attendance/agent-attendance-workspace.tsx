"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentAttendancePage } from "@/components/attendance/agent-attendance-page";
import { MyLeavesPanel } from "@/components/leaves/my-leaves-panel";
import { AppTabBar } from "@/components/ui/app-tab-bar";
import {
  createAgentLeave,
  deleteAgentLeave,
  getAgentLeaves,
  updateAgentLeave,
} from "@/lib/leaves/client";
import type { LeaveRequestRow } from "@/lib/leaves/types";

export function AgentAttendanceWorkspace() {
  const [tab, setTab] = useState("attendance");
  const [leaves, setLeaves] = useState<LeaveRequestRow[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leavesError, setLeavesError] = useState("");

  const loadLeaves = useCallback(async () => {
    setLeavesLoading(true);
    setLeavesError("");
    try {
      const response = await getAgentLeaves();
      setLeaves(response.items);
    } catch (err) {
      setLeavesError(err instanceof Error ? err.message : "Unable to load leave requests.");
      setLeaves([]);
    } finally {
      setLeavesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "leaves") void loadLeaves();
  }, [tab, loadLeaves]);

  const pendingCount = leaves.filter((item) => item.status === "pending").length;

  return (
    <div className="space-y-4">
      <AppTabBar
        active={tab}
        onChange={setTab}
        ariaLabel="Agent attendance workspace"
        tabs={[
          { id: "attendance", label: "My attendance" },
          { id: "leaves", label: "My leaves", count: pendingCount || undefined },
        ]}
      />

      <div className={tab === "attendance" ? undefined : "hidden"}>
        <AgentAttendancePage embedded pollEnabled={tab === "attendance"} />
      </div>

      <div className={tab === "leaves" ? undefined : "hidden"}>
        <MyLeavesPanel
          scope="agent"
          items={leaves}
          loading={leavesLoading}
          error={leavesError}
          onRefresh={loadLeaves}
          onCreate={async (payload) => {
            await createAgentLeave(payload);
          }}
          onUpdate={async (id, payload) => {
            await updateAgentLeave(id, payload);
          }}
          onDelete={async (id) => {
            await deleteAgentLeave(id);
          }}
        />
      </div>
    </div>
  );
}
