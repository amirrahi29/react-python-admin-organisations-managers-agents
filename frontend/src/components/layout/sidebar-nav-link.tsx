"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarNavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  showLabel: boolean;
  onNavigate?: () => void;
};

export function SidebarNavLink({
  href,
  label,
  icon: Icon,
  active,
  showLabel,
  onNavigate,
}: SidebarNavLinkProps) {
  return (
    <Link
      href={href}
      prefetch
      title={!showLabel ? label : undefined}
      onClick={onNavigate}
      className={cn(
        "group app-nav-link",
        !showLabel && "lg:justify-center lg:px-2.5",
        active && "app-nav-link--active",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className={cn("app-nav-link__icon-wrap", active && "app-nav-link__icon-wrap--active")}>
        <Icon className="app-nav-icon size-[17px] shrink-0" />
      </span>
      {showLabel ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}
