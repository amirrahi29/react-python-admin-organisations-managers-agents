import type { Metadata } from "next";
import { ManagerAttendanceWorkspace } from "@/components/attendance/manager-attendance-workspace";

export const metadata: Metadata = {
  title: "Attendance & Leaves",
  description: "Track team attendance and manage leave requests.",
};

export default function ManagerAttendanceRoute() {
  return (
    <div className="app-page-wide">
      <ManagerAttendanceWorkspace />
    </div>
  );
}
