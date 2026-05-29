"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfileDetail({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="app-profile-detail">
      <div className="app-profile-detail__icon" aria-hidden>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="app-profile-detail__label">{label}</p>
        <p className={cn("app-profile-detail__value", mono && "font-mono text-[13px]")}>{value}</p>
      </div>
    </div>
  );
}

export function formatMemberDate(value?: string | null) {
  if (!value) return "Not available";
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "Not available";
  }
}

export function ProfileOverviewHeader({
  avatar,
  name,
  email,
  roleBadge,
  roleTone,
  statusActive = true,
  meta,
}: {
  avatar: React.ReactNode;
  name: string;
  email: string;
  roleBadge: string;
  roleTone: "admin" | "manager" | "agent";
  statusActive?: boolean;
  meta?: React.ReactNode;
}) {
  return (
    <div className="app-profile-identity">
      <div className="app-profile-avatar-ring shrink-0">{avatar}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold tracking-tight text-foreground">{name}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{email}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <span className={cn("app-profile-role-badge", `app-profile-role-badge--${roleTone}`)}>
            {roleBadge}
          </span>
          <span
            className={cn(
              "app-profile-status-pill",
              !statusActive && "app-profile-status-pill--blocked",
            )}
          >
            <span className="app-profile-status-pill__dot" aria-hidden />
            {statusActive ? "Active" : "Blocked"}
          </span>
        </div>
        {meta ? <div className="app-profile-identity__meta">{meta}</div> : null}
      </div>
    </div>
  );
}

export function ProfileOrgBlock({
  title,
  name,
  meta,
  icon: Icon,
}: {
  title: string;
  name: string;
  meta?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="app-profile-org-item">
      <p className="app-profile-org-item__label">{title}</p>
      <p className="app-profile-org-item__name">
        <Icon className="size-3.5 text-primary" />
        {name}
      </p>
      {meta ? <p className="app-profile-org-item__meta">{meta}</p> : null}
    </div>
  );
}
