"use client";

import { SelfAttendancePanel } from "@/components/attendance/self-attendance-panel";
import { FadeIn } from "@/components/ui/motion";
import { getAgentAttendance } from "@/lib/attendance/client";

export function AgentAttendancePage({
  embedded = false,
  pollEnabled = true,
}: {
  embedded?: boolean;
  pollEnabled?: boolean;
}) {
  return (
    <div className={embedded ? "space-y-5" : "app-page-wide space-y-5"}>
      {!embedded ? (
        <FadeIn>
          <div className="app-hero-banner">
            <div className="app-hero-glow" aria-hidden />
            <div className="relative">
              <p className="app-section-label text-primary">Attendance</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">My attendance</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Login and logout times, 9-hour target, active work, idle periods, and live status.
              </p>
            </div>
          </div>
        </FadeIn>
      ) : null}

      <FadeIn delay={40}>
        <SelfAttendancePanel loadDetail={getAgentAttendance} pollEnabled={pollEnabled} />
      </FadeIn>
    </div>
  );
}
