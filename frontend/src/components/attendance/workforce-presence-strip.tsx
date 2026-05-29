"use client";

import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import {
  describeTeamActiveTime,
  describeTeamIdleNow,
  describeTeamLoggedInToday,
  describeTeamOnlineNow,
} from "@/lib/attendance/constants";
import type { WorkforcePresenceKpis } from "@/hooks/use-workforce-presence";

type WorkforcePresenceStripProps = {
  title: string;
  subtitle: string;
  href: string;
  kpis: WorkforcePresenceKpis;
  loading?: boolean;
  delay?: number;
};

function PresenceKpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="attendance-kpi rounded-xl border border-border/60 bg-background/60 p-4">
      <p className="attendance-kpi__value text-lg font-semibold">{value}</p>
      <p className="attendance-kpi__label mt-1 text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

export function WorkforcePresenceStrip({
  title,
  subtitle,
  href,
  kpis,
  loading = false,
  delay = 0,
}: WorkforcePresenceStripProps) {
  const total = Math.max(kpis.online + kpis.idle + kpis.offline, kpis.tracked, 1);

  return (
    <FadeIn delay={delay}>
      <div className="app-surface app-surface--elevated overflow-hidden admin-presence-strip">
        <div className="flex flex-col gap-4 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="app-section-label">Workforce</p>
            <h2 className="mt-1 text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <Link href={href} className="manager-agent-table__link shrink-0">
            Open attendance
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
          <PresenceKpi
            label="Who showed up today"
            value={loading ? "Loading…" : describeTeamLoggedInToday(kpis.tracked)}
            sub={`${kpis.tracked} of ${total} tracked`}
          />
          <PresenceKpi
            label="Currently working"
            value={loading ? "Loading…" : describeTeamOnlineNow(kpis.online)}
            sub={`${kpis.online} online now`}
          />
          <PresenceKpi
            label="Away from desk"
            value={loading ? "Loading…" : describeTeamIdleNow(kpis.idle)}
            sub={`${kpis.idle} away now`}
          />
          <PresenceKpi
            label="Team active time today"
            value={loading ? "Loading…" : describeTeamActiveTime(kpis.activeMinutes)}
            sub={`${kpis.activeMinutes} minutes total`}
          />
        </div>
        {!loading ? (
          <div className="admin-presence-strip__footer flex items-center gap-3 px-4 pb-4 sm:px-5">
            <span className="admin-presence-strip__footer-label inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" aria-hidden />
              Team status
            </span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-emerald-500"
                style={{ width: `${(kpis.online / total) * 100}%` }}
              />
              <div
                className="bg-amber-400"
                style={{ width: `${(kpis.idle / total) * 100}%` }}
              />
              <div
                className="bg-slate-300"
                style={{ width: `${(kpis.offline / total) * 100}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </FadeIn>
  );
}
