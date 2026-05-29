"use client";

import type { AttendancePresenceRole } from "@/lib/auth/role-layout.client";
import { useAttendancePresence } from "@/hooks/use-attendance-presence";

export function AttendancePresenceTracker({ role }: { role: AttendancePresenceRole }) {
  useAttendancePresence({ role, enabled: true });
  return null;
}
