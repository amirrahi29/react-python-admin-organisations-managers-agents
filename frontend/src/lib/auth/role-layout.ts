import type { LucideIcon } from "lucide-react";
import type { AuthRole } from "@/lib/auth/constants";

export type RoleNavChild = {
  href?: string;
  label: string;
  children?: RoleNavChild[];
};

export type RoleNavItem = {
  href?: string;
  label: string;
  icon: LucideIcon;
  children?: RoleNavChild[];
  /** Custom active-state check (e.g. nested routes like /agents/:id/human-calls). */
  isActive?: (pathname: string) => boolean;
};

export type RoleLayoutConfig = {
  role: AuthRole;
  portalLabel: string;
  portalBadge: string;
  loginPath: string;
  dashboardPath: string;
  profilePath: string;
  navItems: RoleNavItem[];
  pageMeta: Record<string, { title: string; subtitle: string }>;
};
