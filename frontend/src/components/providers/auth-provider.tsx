"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminInfo } from "@/lib/auth/constants";
import { getCurrentAdmin } from "@/lib/auth/client";

type AuthContextValue = {
  admin: AdminInfo | null;
  setAdmin: (admin: AdminInfo | null) => void;
  refreshAdmin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialAdmin = null,
}: {
  children: ReactNode;
  initialAdmin?: AdminInfo | null;
}) {
  const [admin, setAdmin] = useState<AdminInfo | null>(initialAdmin);

  const refreshAdmin = useCallback(async () => {
    try {
      const data = await getCurrentAdmin();
      setAdmin(data.admin);
    } catch {
      setAdmin(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      admin,
      setAdmin,
      refreshAdmin,
    }),
    [admin, refreshAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
