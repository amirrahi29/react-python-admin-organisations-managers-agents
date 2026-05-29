"use client";

import { useState } from "react";
import { RoleProfilePage } from "@/components/profile/role-profile-page";
import type { ManagerInfo } from "@/lib/auth/constants";

export function ManagerProfilePageClient({ manager: initialManager }: { manager: ManagerInfo }) {
  const [manager, setManager] = useState(initialManager);
  return (
    <RoleProfilePage
      authRole="manager"
      user={manager}
      onUpdated={(user) => setManager(user as ManagerInfo)}
    />
  );
}
