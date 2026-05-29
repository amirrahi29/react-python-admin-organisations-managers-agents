"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleNavGroup } from "@/components/layout/collapsible-nav-group";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { APP_BRAND_MARK, APP_NAME } from "@/lib/app-config";
import type { RoleLayoutConfig } from "@/lib/auth/role-layout";
import { isNavLinkActive } from "@/lib/layout/nav-active";
import { useUiStore } from "@/lib/stores/ui-store";

export function RoleDashboardSidebar({ config }: { config: RoleLayoutConfig }) {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const showLabels = !collapsed || mobileNavOpen;

  const flatHrefs = config.navItems.flatMap((item) =>
    item.href ? [item.href] : (item.children?.map((child) => child.href).filter(Boolean) as string[]),
  );

  function afterNavClick() {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setMobileNavOpen(false);
    }
  }

  return (
    <aside
      className={cn(
        "app-sidebar flex h-full shrink-0 flex-col border-r border-sidebar-border text-sidebar-foreground",
        "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:shadow-2xl",
        "max-lg:transition-transform max-lg:duration-200 max-lg:ease-out",
        mobileNavOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        "lg:relative lg:translate-x-0 lg:transition-[width] lg:duration-200 lg:ease-out",
        collapsed ? "lg:w-[72px]" : "lg:w-[252px]",
        "w-[min(100vw-2rem,280px)] max-lg:w-[min(100vw-2rem,280px)]",
      )}
    >
      <div className="app-sidebar__header">
        <Link
          href={config.dashboardPath}
          prefetch
          onClick={afterNavClick}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none ring-ring focus-visible:ring-2"
        >
          <div className="app-brand-mark">{APP_BRAND_MARK}</div>
          {showLabels ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                {APP_NAME}
              </p>
              <p className="truncate text-[11px] font-medium text-sidebar-foreground/50">
                {config.portalLabel}
              </p>
            </div>
          ) : null}
        </Link>
      </div>

      <nav className="app-sidebar__nav">
        {showLabels ? <p className="app-sidebar__section-label">Navigation</p> : null}
        <ul className="flex flex-col gap-0.5">
          {config.navItems.map((item) => {
            if (item.children) {
              return (
                <CollapsibleNavGroup
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  items={item.children}
                  pathname={pathname}
                  showLabels={showLabels}
                  onNavigate={afterNavClick}
                />
              );
            }

            if (!item.href) return null;

            const active =
              item.isActive?.(pathname) ??
              isNavLinkActive(pathname, item.href, flatHrefs);

            return (
              <li key={item.href}>
                <SidebarNavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={active}
                  showLabel={showLabels}
                  onNavigate={afterNavClick}
                />
              </li>
            );
          })}
        </ul>

        {showLabels ? (
          <p className="app-sidebar__footnote mt-auto">
            <PanelLeftClose className="size-3.5 shrink-0 opacity-60" />
            Protected session · sign out when done
          </p>
        ) : null}
      </nav>

      <div className="app-sidebar__footer hidden lg:block">
        <button
          type="button"
          onClick={toggleSidebar}
          className="app-sidebar__collapse-btn"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <ChevronLeft className="size-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
