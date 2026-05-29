import type { Metadata } from "next";
import { AdminAttendanceWorkspace } from "@/lib/lazy/dashboard-pages";

export const metadata: Metadata = {
  title: "Attendance & Leaves",
  description: "Track attendance and manage leave approvals.",
};

export default function AdminAttendanceRoute() {
  return (
    <div className="app-page-wide">
      <AdminAttendanceWorkspace />
    </div>
  );
}
