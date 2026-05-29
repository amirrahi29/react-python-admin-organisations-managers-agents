"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { RoleDashboardHeader } from "@/components/layout/role-dashboard-header";
import { RoleDashboardSidebar } from "@/components/layout/role-dashboard-sidebar";
import { useUiStore } from "@/lib/stores/ui-store";
import type { RoleHierarchyChain } from "@/lib/auth/hierarchy";
import type { RoleLayoutConfig } from "@/lib/auth/role-layout";
import type { AuthRole } from "@/lib/auth/constants";
import { getRoleLayout } from "@/lib/auth/role-layout.client";
import { AttendancePresenceTracker } from "@/components/attendance/attendance-presence-tracker";
import { sendAttendanceLogout } from "@/lib/attendance/client";
import { logoutRole } from "@/lib/auth/client";

type RoleDashboardShellProps = {
  role: AuthRole;
  displayName: string;
  displayEmail: string;
  accountId?: string;
  hierarchy?: RoleHierarchyChain;
  children: React.ReactNode;
};

export function RoleDashboardShell({
  role,
  displayName,
  displayEmail,
  accountId,
  hierarchy,
  children,
}: RoleDashboardShellProps) {
  const config: RoleLayoutConfig = getRoleLayout(role);
  const pathname = usePathname();
  // Single subscription with a shallow equality check so unrelated store
  // updates (e.g. theme toggles) don't re-render the shell.
  const { mobileNavOpen, setMobileNavOpen } = useUiStore(
    useShallow((s) => ({
      mobileNavOpen: s.mobileNavOpen,
      setMobileNavOpen: s.setMobileNavOpen,
    })),
  );

  // Stable sign-out callback so the header doesn't re-render every parent tick.
  const handleSignOut = useCallback(async () => {
    if (config.role === "agent" || config.role === "manager") {
      await sendAttendanceLogout(config.role);
    }
    await logoutRole(config.role);
  }, [config.role]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {role === "manager" || role === "agent" ? <AttendancePresenceTracker role={role} /> : null}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <RoleDashboardSidebar config={config} />

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <RoleDashboardHeader
          config={config}
          displayName={displayName}
          displayEmail={displayEmail}
          accountId={accountId}
          hierarchy={hierarchy}
          onSignOut={handleSignOut}
        />
        <main className="app-main-pattern min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
