"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { RoleHierarchyTree } from "@/components/profile/role-hierarchy-tree";
import { cn } from "@/lib/utils";
import type { RoleHierarchyMember } from "@/lib/auth/constants";

type RoleHierarchyHoverProps = {
  nodes: RoleHierarchyMember[];
  children: ReactNode;
  placement?: "bottom-start" | "bottom-end";
  className?: string;
};

export function RoleHierarchyHover({
  nodes,
  children,
  placement = "bottom-start",
  className,
}: RoleHierarchyHoverProps) {
  const [open, setOpen] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const showPanel = useCallback(() => {
    clearHideTimeout();
    setOpen(true);
  }, [clearHideTimeout]);

  const hidePanel = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => setOpen(false), 120);
  }, [clearHideTimeout]);

  if (!nodes.length) {
    return <>{children}</>;
  }

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      onMouseEnter={showPanel}
      onMouseLeave={hidePanel}
    >
      {children}

      <div
        role="tooltip"
        className={cn(
          "app-role-hover-panel pointer-events-none absolute top-full z-[70] mt-2.5 opacity-0 transition-[opacity,transform] duration-200 ease-out",
          placement === "bottom-end" ? "right-0 origin-top-right" : "left-0 origin-top-left",
          open && "pointer-events-auto translate-y-0 scale-100 opacity-100",
          !open && "-translate-y-1 scale-[0.98]"
        )}
        onMouseEnter={showPanel}
        onMouseLeave={hidePanel}
      >
        <RoleHierarchyTree nodes={nodes} />
      </div>
    </span>
  );
}
