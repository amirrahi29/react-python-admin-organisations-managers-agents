"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Laptop,
  LogOut,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useUiStore, type ThemeMode } from "@/lib/stores/ui-store";
import { useClickOutside } from "@/hooks/use-click-outside";
import { RoleHierarchyHover } from "@/components/profile/role-hierarchy-hover";
import type { RoleHierarchyChain } from "@/lib/auth/hierarchy";
import type { RoleLayoutConfig } from "@/lib/auth/role-layout";
import { ADMIN_MANAGERS_PATH } from "@/lib/team/constants";
import { Spinner } from "@/components/ui/spinner";

function isManagerAgentEditPath(path: string) {
  return /^\/manager\/dashboard\/agents\/[^/]+$/.test(path);
}

function resolveAdminPageMeta(pathname: string, config: RoleLayoutConfig) {
  if (pathname.startsWith(`${ADMIN_MANAGERS_PATH}/`) && pathname.endsWith("/agents")) {
    return { title: "Manager agents", subtitle: "Team management" };
  }
  if (pathname.startsWith(`${ADMIN_MANAGERS_PATH}/`)) {
    return { title: "Edit manager", subtitle: "Team management" };
  }
  if (/^\/admin\/dashboard\/organizations\/\d+\/managers/.test(pathname)) {
    return { title: "Organization managers", subtitle: "Team management" };
  }
  if (/^\/admin\/dashboard\/agents\/[^/]+$/.test(pathname)) {
    return { title: "Edit agent", subtitle: "Team management" };
  }
  return config.pageMeta[pathname] ?? config.pageMeta[config.dashboardPath];
}

type RoleDashboardHeaderProps = {
  config: RoleLayoutConfig;
  displayName: string;
  displayEmail: string;
  accountId?: string;
  hierarchy?: RoleHierarchyChain;
  onSignOut: () => Promise<void>;
};

export function RoleDashboardHeader({
  config,
  displayName,
  displayEmail,
  accountId,
  hierarchy,
  onSignOut,
}: RoleDashboardHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useClickOutside(menuRef, closeMenu, menuOpen);

  const themeOptions: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Laptop },
  ];

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await onSignOut();
      closeMenu();
      window.location.href = config.loginPath;
    } finally {
      setSigningOut(false);
    }
  }

  const current =
    (config.role === "admin"
      ? resolveAdminPageMeta(pathname, config)
      : isManagerAgentEditPath(pathname)
        ? { title: "Edit agent", subtitle: "Your team" }
        : null) ??
    config.pageMeta[pathname] ??
    config.pageMeta[config.dashboardPath];

  return (
    <header className="app-header-bar flex h-16 shrink-0 items-center gap-2 px-3 sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className="app-icon-btn flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
          {current.subtitle}
        </p>
        <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{current.title}</h1>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={cn("app-user-menu", menuOpen && "app-user-menu--open")}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          {hierarchy?.nodes.length ? (
            <RoleHierarchyHover nodes={hierarchy.nodes} placement="bottom-end">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-xs font-semibold text-primary-foreground">
                {getInitials(displayName, "U")}
              </span>
            </RoleHierarchyHover>
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-xs font-semibold text-primary-foreground">
              {getInitials(displayName, "U")}
            </span>
          )}
          <div className="hidden min-w-0 text-left sm:block">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
              menuOpen && "rotate-180"
            )}
          />
        </button>
        {menuOpen && (
          <div role="menu" className="app-dropdown">
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
              {accountId ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">ID: {accountId}</p>
              ) : null}
            </div>
            <div className="px-2 py-2">
              <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Theme</p>
              <div className="flex gap-1">
                {themeOptions.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-medium transition-colors duration-150",
                      theme === id
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive transition-[background-color,padding] duration-200 hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              {signingOut ? (
                <Spinner size="sm" className="shrink-0" />
              ) : (
                <LogOut className="size-4" />
              )}
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
