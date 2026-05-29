"use client";

import dynamic from "next/dynamic";
import { DashboardRouteLoading } from "@/components/layout/dashboard-route-loading";

const loading = () => <DashboardRouteLoading />;

export const TeamManagementPage = dynamic(
  () =>
    import("@/components/team/team-management-page").then((module) => ({
      default: module.TeamManagementPage,
    })),
  { loading },
);

export const OrganizationsManagementPage = dynamic(
  () =>
    import("@/components/organizations/organizations-management-page").then((module) => ({
      default: module.OrganizationsManagementPage,
    })),
  { loading },
);

export const AdminAttendanceWorkspace = dynamic(
  () =>
    import("@/components/attendance/admin-attendance-workspace").then((module) => ({
      default: module.AdminAttendanceWorkspace,
    })),
  { loading },
);

export const ManagerAttendanceWorkspace = dynamic(
  () =>
    import("@/components/attendance/manager-attendance-workspace").then((module) => ({
      default: module.ManagerAttendanceWorkspace,
    })),
  { loading },
);

export const AgentAttendanceWorkspace = dynamic(
  () =>
    import("@/components/attendance/agent-attendance-workspace").then((module) => ({
      default: module.AgentAttendanceWorkspace,
    })),
  { loading },
);
