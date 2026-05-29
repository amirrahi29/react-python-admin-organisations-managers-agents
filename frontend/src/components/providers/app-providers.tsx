"use client";

import { useEffect, useLayoutEffect } from "react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { useUiStore, type ThemeMode } from "@/lib/stores/ui-store";
import type { AdminInfo } from "@/lib/auth/constants";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && systemDark);
  root.classList.toggle("dark", dark);
}

export function AppProviders({
  children,
  initialAdmin = null,
}: {
  children: React.ReactNode;
  initialAdmin?: AdminInfo | null;
}) {
  const theme = useUiStore((s) => s.theme);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (useUiStore.getState().theme === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return <AuthProvider initialAdmin={initialAdmin}>{children}</AuthProvider>;
}
