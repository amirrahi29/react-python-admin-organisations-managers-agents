import type { Metadata } from "next";
import { AgentAttendanceWorkspace } from "@/lib/lazy/dashboard-pages";

export const metadata: Metadata = {
  title: "Attendance & Leaves",
  description: "View your attendance and manage leave requests.",
};

export default function AgentAttendanceRoute() {
  return (
    <div className="app-page-wide">
      <AgentAttendanceWorkspace />
    </div>
  );
}
