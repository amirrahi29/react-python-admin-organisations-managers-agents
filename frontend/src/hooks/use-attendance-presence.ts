"use client";

import { useEffect, useRef } from "react";
import type { AuthRole } from "@/lib/auth/constants";
import { sendPresence } from "@/lib/attendance/client";
import type { PresenceEvent } from "@/lib/attendance/types";

export const ATTENDANCE_HEARTBEAT_MS = 60_000;
export const ATTENDANCE_IDLE_MS = 5 * 60_000;

type UseAttendancePresenceOptions = {
  role: Exclude<AuthRole, "admin">;
  enabled?: boolean;
};

export function useAttendancePresence({ role, enabled = true }: UseAttendancePresenceOptions) {
  const idleRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const activeRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    activeRef.current = true;

    function ping(event: PresenceEvent) {
      if (!activeRef.current) return;
      void sendPresence(role, event)
        .then((result) => {
          if (result.reopened) {
            idleRef.current = false;
            lastActivityRef.current = Date.now();
          }
        })
        .catch((error: unknown) => {
          if (error instanceof Error && /not authenticated|401/i.test(error.message)) {
            activeRef.current = false;
          }
        });
    }

    function markActivity() {
      lastActivityRef.current = Date.now();
      if (idleRef.current) {
        idleRef.current = false;
        ping("active");
      }
    }

    function checkIdle() {
      if (document.hidden) return;
      const inactiveFor = Date.now() - lastActivityRef.current;
      if (!idleRef.current && inactiveFor >= ATTENDANCE_IDLE_MS) {
        idleRef.current = true;
        ping("idle_start");
      }
    }

    ping("heartbeat");
    const heartbeatTimer = window.setInterval(() => {
      if (document.hidden) return;
      ping("heartbeat");
      checkIdle();
    }, ATTENDANCE_HEARTBEAT_MS);

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, markActivity, { passive: true });
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        markActivity();
        ping("heartbeat");
      }
    });

    const idleTimer = window.setInterval(checkIdle, 30_000);

    return () => {
      activeRef.current = false;
      window.clearInterval(heartbeatTimer);
      window.clearInterval(idleTimer);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, markActivity);
      }
    };
  }, [enabled, role]);
}
