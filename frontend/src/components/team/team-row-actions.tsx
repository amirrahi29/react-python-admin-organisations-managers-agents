"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Ban,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TeamRowActionsProps = {
  editHref: string;
  active: boolean;
  busy: boolean;
  onToggleStatus: () => void;
  onDelete: () => void;
  layout?: "table" | "card";
};

const MENU_WIDTH = 168;
const MENU_HEIGHT = 152;
const MENU_GAP = 6;

type MenuCoords = {
  top: number;
  left: number;
};

function TeamRowActionsMenu({
  editHref,
  active,
  busy,
  onToggleStatus,
  onDelete,
  onClose,
  className,
  style,
  menuRef,
}: {
  editHref: string;
  active: boolean;
  busy: boolean;
  onToggleStatus: () => void;
  onDelete: () => void;
  onClose: () => void;
  className?: string;
  style?: CSSProperties;
  menuRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={menuRef}
      role="menu"
      className={cn("team-row-actions__dropdown", className)}
      style={style}
    >
      <Link href={editHref} role="menuitem" className="team-row-actions__item" onClick={onClose}>
        <Pencil className="size-4 shrink-0" />
        Edit profile
      </Link>
      <button
        type="button"
        role="menuitem"
        className="team-row-actions__item"
        disabled={busy}
        onClick={onToggleStatus}
      >
        {active ? <Ban className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
        {busy ? (active ? "Blocking..." : "Activating...") : active ? "Block access" : "Activate"}
      </button>
      <button
        type="button"
        role="menuitem"
        className="team-row-actions__item team-row-actions__item--danger"
        disabled={busy}
        onClick={onDelete}
      >
        <Trash2 className="size-4 shrink-0" />
        Delete
      </button>
    </div>
  );
}

export function TeamRowActions({
  editHref,
  active,
  busy,
  onToggleStatus,
  onDelete,
  layout = "table",
}: TeamRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const useFloatingMenu = layout === "table";
  const closeMenu = useCallback(() => setOpen(false), []);

  const updateMenuCoords = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_HEIGHT + MENU_GAP;
    const top = openUp ? rect.top - MENU_HEIGHT - MENU_GAP : rect.bottom + MENU_GAP;
    const left = Math.min(
      Math.max(MENU_GAP, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - MENU_GAP,
    );

    setMenuCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open || !useFloatingMenu) {
      setMenuCoords(null);
      return;
    }
    updateMenuCoords();
  }, [open, updateMenuCoords, useFloatingMenu]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuWrapRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      closeMenu();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [closeMenu, open]);

  useEffect(() => {
    if (!open || !useFloatingMenu) return;

    function handleReflow() {
      updateMenuCoords();
    }

    window.addEventListener("resize", handleReflow);
    window.addEventListener("scroll", handleReflow, true);
    return () => {
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("scroll", handleReflow, true);
    };
  }, [open, updateMenuCoords, useFloatingMenu]);

  function handleToggleStatus() {
    closeMenu();
    onToggleStatus();
  }

  function handleDelete() {
    closeMenu();
    onDelete();
  }

  const menuProps = {
    editHref,
    active,
    busy,
    onToggleStatus: handleToggleStatus,
    onDelete: handleDelete,
    onClose: closeMenu,
  };

  const floatingMenu =
    open && useFloatingMenu && menuCoords
      ? createPortal(
          <TeamRowActionsMenu
            {...menuProps}
            menuRef={dropdownRef}
            className="team-row-actions__dropdown--fixed"
            style={{
              position: "fixed",
              top: menuCoords.top,
              left: menuCoords.left,
              right: "auto",
              minWidth: MENU_WIDTH,
            }}
          />,
          document.body,
        )
      : null;

  return (
    <div
      className={cn(
        "team-row-actions",
        layout === "card" && "team-row-actions--card",
      )}
    >
      <div className="team-row-actions__menu" ref={menuWrapRef}>
        <button
          ref={triggerRef}
          type="button"
          className={cn("team-row-actions__trigger", open && "team-row-actions__trigger--open")}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="More actions"
          disabled={busy}
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal className="size-4" />
        </button>

        {open && !useFloatingMenu ? <TeamRowActionsMenu {...menuProps} /> : null}
      </div>

      {floatingMenu}
    </div>
  );
}
