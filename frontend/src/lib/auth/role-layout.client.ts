"use client";

import { Building2, Clock3, LayoutDashboard, Shield, User, UserCog, Users } from "lucide-react";
import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_PROFILE_PATH,
  AGENT_DASHBOARD_PATH,
  AGENT_LOGIN_PATH,
  AGENT_PROFILE_PATH,
  MANAGER_DASHBOARD_PATH,
  MANAGER_LOGIN_PATH,
  MANAGER_PROFILE_PATH,
  ORGANIZATION_DASHBOARD_PATH,
  ORGANIZATION_LOGIN_PATH,
  ORGANIZATION_PROFILE_PATH,
  type AuthRole,
} from "@/lib/auth/constants";
import type { RoleLayoutConfig } from "@/lib/auth/role-layout";
import {
  ADMIN_AGENTS_PATH,
  ADMIN_MANAGERS_PATH,
  MANAGER_AGENTS_PATH,
} from "@/lib/team/constants";
import {
  ADMIN_ORGANIZATIONS_PATH,
  ORGANIZATION_AGENTS_PATH,
  ORGANIZATION_MANAGERS_PATH,
} from "@/lib/organizations/constants";
import {
  AGENT_ATTENDANCE_PATH,
  ADMIN_ATTENDANCE_PATH,
  MANAGER_ATTENDANCE_PATH,
} from "@/lib/attendance/constants";

export const ADMIN_LAYOUT: RoleLayoutConfig = {
  role: "admin",
  portalLabel: "Admin workspace",
  portalBadge: "Admin",
  loginPath: ADMIN_LOGIN_PATH,
  dashboardPath: ADMIN_DASHBOARD_PATH,
  profilePath: ADMIN_PROFILE_PATH,
  navItems: [
    { href: ADMIN_DASHBOARD_PATH, label: "Dashboard", icon: LayoutDashboard },
    { href: ADMIN_ORGANIZATIONS_PATH, label: "Organizations", icon: Building2 },
    { href: ADMIN_MANAGERS_PATH, label: "Managers", icon: Users },
    { href: ADMIN_AGENTS_PATH, label: "Agents", icon: UserCog },
    { href: ADMIN_ATTENDANCE_PATH, label: "Attendance", icon: Clock3 },
    { href: ADMIN_PROFILE_PATH, label: "Profile", icon: User },
  ],
  pageMeta: {
    [ADMIN_DASHBOARD_PATH]: { title: "Dashboard", subtitle: "Overview" },
    [ADMIN_ORGANIZATIONS_PATH]: { title: "Organizations", subtitle: "Team management" },
    [ADMIN_MANAGERS_PATH]: { title: "Managers", subtitle: "Team management" },
    [ADMIN_AGENTS_PATH]: { title: "Agents", subtitle: "Team management" },
    [ADMIN_ATTENDANCE_PATH]: { title: "Attendance & Leaves", subtitle: "Presence and leave management" },
    [ADMIN_PROFILE_PATH]: { title: "Profile", subtitle: "Account settings" },
  },
};

export const ORGANIZATION_LAYOUT: RoleLayoutConfig = {
  role: "organization",
  portalLabel: "Organization Portal",
  portalBadge: "Organization",
  loginPath: ORGANIZATION_LOGIN_PATH,
  dashboardPath: ORGANIZATION_DASHBOARD_PATH,
  profilePath: ORGANIZATION_PROFILE_PATH,
  navItems: [
    { href: ORGANIZATION_DASHBOARD_PATH, label: "Dashboard", icon: LayoutDashboard },
    { href: ORGANIZATION_MANAGERS_PATH, label: "Managers", icon: Shield },
    { href: ORGANIZATION_AGENTS_PATH, label: "Agents", icon: UserCog },
    { href: ORGANIZATION_PROFILE_PATH, label: "Profile", icon: User },
  ],
  pageMeta: {
    [ORGANIZATION_DASHBOARD_PATH]: { title: "Dashboard", subtitle: "Organization workspace" },
    [ORGANIZATION_MANAGERS_PATH]: { title: "Managers", subtitle: "Organization team" },
    [ORGANIZATION_AGENTS_PATH]: { title: "Agents", subtitle: "Organization team" },
    [ORGANIZATION_PROFILE_PATH]: { title: "Profile", subtitle: "Account settings" },
  },
};

export const MANAGER_LAYOUT: RoleLayoutConfig = {
  role: "manager",
  portalLabel: "Manager Portal",
  portalBadge: "Manager",
  loginPath: MANAGER_LOGIN_PATH,
  dashboardPath: MANAGER_DASHBOARD_PATH,
  profilePath: MANAGER_PROFILE_PATH,
  navItems: [
    { href: MANAGER_DASHBOARD_PATH, label: "Dashboard", icon: LayoutDashboard },
    { href: MANAGER_AGENTS_PATH, label: "Agents", icon: UserCog },
    { href: MANAGER_ATTENDANCE_PATH, label: "Attendance", icon: Clock3 },
    { href: MANAGER_PROFILE_PATH, label: "Profile", icon: User },
  ],
  pageMeta: {
    [MANAGER_DASHBOARD_PATH]: { title: "Dashboard", subtitle: "Manager workspace" },
    [MANAGER_AGENTS_PATH]: { title: "Agents", subtitle: "Your team members" },
    [MANAGER_ATTENDANCE_PATH]: { title: "Attendance & Leaves", subtitle: "Team presence and leave management" },
    [MANAGER_PROFILE_PATH]: { title: "Profile", subtitle: "Account settings" },
  },
};

export const AGENT_LAYOUT: RoleLayoutConfig = {
  role: "agent",
  portalLabel: "Agent Portal",
  portalBadge: "Agent",
  loginPath: AGENT_LOGIN_PATH,
  dashboardPath: AGENT_DASHBOARD_PATH,
  profilePath: AGENT_PROFILE_PATH,
  navItems: [
    { href: AGENT_DASHBOARD_PATH, label: "Dashboard", icon: LayoutDashboard },
    { href: AGENT_ATTENDANCE_PATH, label: "Attendance", icon: Clock3 },
    { href: AGENT_PROFILE_PATH, label: "Profile", icon: User },
  ],
  pageMeta: {
    [AGENT_DASHBOARD_PATH]: { title: "Dashboard", subtitle: "Agent workspace" },
    [AGENT_ATTENDANCE_PATH]: { title: "Attendance & Leaves", subtitle: "Your sessions and leave requests" },
    [AGENT_PROFILE_PATH]: { title: "Profile", subtitle: "Account settings" },
  },
};

export function getRoleLayout(role: AuthRole): RoleLayoutConfig {
  if (role === "admin") return ADMIN_LAYOUT;
  if (role === "organization") return ORGANIZATION_LAYOUT;
  if (role === "manager") return MANAGER_LAYOUT;
  return AGENT_LAYOUT;
}

export type AttendancePresenceRole = "manager" | "agent";
