"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleNavChild } from "@/lib/auth/role-layout";

type CollapsibleNavGroupProps = {
  label: string;
  icon: LucideIcon;
  items: RoleNavChild[];
  pathname: string;
  showLabels: boolean;
  onNavigate?: () => void;
};

function isLinkActive(pathname: string, href: string, siblings: RoleNavChild[] = []) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  const longerSibling = siblings.find(
    (item) =>
      item.href &&
      item.href !== href &&
      item.href.startsWith(`${href}/`) &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`))
  );
  return !longerSibling;
}

function isChildActive(pathname: string, child: RoleNavChild, siblings: RoleNavChild[] = []): boolean {
  if (child.href && isLinkActive(pathname, child.href, siblings)) {
    return true;
  }
  return child.children?.some((nested, index, list) => isChildActive(pathname, nested, list)) ?? false;
}

function isSectionActive(pathname: string, items: RoleNavChild[]) {
  return items.some((child) => isChildActive(pathname, child));
}

function NavChildLink({
  child,
  pathname,
  onNavigate,
  nested = false,
  siblings = [],
}: {
  child: RoleNavChild;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
  siblings?: RoleNavChild[];
}) {
  if (!child.href) return null;
  const active = isLinkActive(pathname, child.href, siblings);

  return (
    <li>
      <Link
        href={child.href}
        prefetch
        onClick={onNavigate}
        className={cn(
          "group app-nav-link py-2 pl-4 text-[13px]",
          nested && "pl-3",
          active && "app-nav-link--active"
        )}
      >
        <span className="truncate">{child.label}</span>
      </Link>
    </li>
  );
}

function NavChildGroup({
  child,
  pathname,
  onNavigate,
}: {
  child: RoleNavChild;
  pathname: string;
  onNavigate?: () => void;
}) {
  const sectionActive = isChildActive(pathname, child);
  const [open, setOpen] = useState(sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  if (!child.children?.length) {
    return <NavChildLink child={child} pathname={pathname} onNavigate={onNavigate} />;
  }

  return (
    <li className="space-y-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-muted hover:text-sidebar-foreground",
          sectionActive && "text-primary"
        )}
      >
        <span className="truncate">{child.label}</span>
        <ChevronDown
          className={cn(
            "ml-auto size-3.5 shrink-0 text-sidebar-foreground/45 transition-transform duration-200",
            open && "rotate-180",
            sectionActive && "text-primary"
          )}
        />
      </button>
      {open ? (
        <ul className="ml-2 flex flex-col gap-1 border-l border-sidebar-border/70 pl-2">
          {child.children.map((nested, index, list) =>
            nested.children?.length ? (
              <NavChildGroup key={nested.label} child={nested} pathname={pathname} onNavigate={onNavigate} />
            ) : (
              <NavChildLink
                key={nested.href ?? nested.label}
                child={nested}
                pathname={pathname}
                onNavigate={onNavigate}
                nested
                siblings={list}
              />
            )
          )}
        </ul>
      ) : null}
    </li>
  );
}

export function CollapsibleNavGroup({
  label,
  icon: Icon,
  items,
  pathname,
  showLabels,
  onNavigate,
}: CollapsibleNavGroupProps) {
  const sectionActive = isSectionActive(pathname, items);
  const [open, setOpen] = useState(sectionActive);

  useEffect(() => {
    if (sectionActive) {
      setOpen(true);
    }
  }, [sectionActive]);

  if (!showLabels) {
    const firstHref = items.find((item) => item.href)?.href ?? items[0]?.children?.[0]?.href;
    if (!firstHref) return null;

    return (
      <li>
        <Link
          href={firstHref}
          prefetch
          title={label}
          onClick={onNavigate}
          className={cn(
            "group app-nav-link lg:justify-center lg:px-2.5",
            sectionActive && "app-nav-link--active",
          )}
        >
          <span className={cn("app-nav-link__icon-wrap", sectionActive && "app-nav-link__icon-wrap--active")}>
            <Icon className="app-nav-icon size-[17px] shrink-0" />
          </span>
        </Link>
      </li>
    );
  }

  return (
    <li className="space-y-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`nav-group-${label.toLowerCase().replace(/\s+/g, "-")}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "group app-nav-link w-full text-left",
          sectionActive && "app-nav-link--active",
        )}
      >
        <span className={cn("app-nav-link__icon-wrap", sectionActive && "app-nav-link__icon-wrap--active")}>
          <Icon className="app-nav-icon size-[17px] shrink-0" />
        </span>
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            "ml-auto size-4 shrink-0 text-sidebar-foreground/45 transition-transform duration-200",
            open && "rotate-180",
            sectionActive && "text-primary"
          )}
        />
      </button>

      {open ? (
        <ul
          id={`nav-group-${label.toLowerCase().replace(/\s+/g, "-")}`}
          className="ml-2 flex flex-col gap-1 border-l border-sidebar-border/70 pl-2"
        >
          {items.map((child, index, list) =>
            child.children?.length ? (
              <NavChildGroup key={child.label} child={child} pathname={pathname} onNavigate={onNavigate} />
            ) : (
              <NavChildLink
                key={child.href ?? child.label}
                child={child}
                pathname={pathname}
                onNavigate={onNavigate}
                siblings={list}
              />
            )
          )}
        </ul>
      ) : null}
    </li>
  );
}
