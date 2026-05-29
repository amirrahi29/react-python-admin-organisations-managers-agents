"use client";

import { Activity, Clock3, LogIn, LogOut, Moon, Zap } from "lucide-react";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import {
  ATTENDANCE_EVENT_LABELS,
  ATTENDANCE_STALE_SESSION_SECONDS,
  dedupeAttendanceTimelineEvents,
  describeSessionDuration,
  formatAttendanceDateTime,
  formatAttendanceMinutes,
  formatAttendanceTime,
  getVisibleAttendanceEvents,
} from "@/lib/attendance/constants";
import type { AttendanceEventRow, AttendanceSessionRow } from "@/lib/attendance/types";
import { cn } from "@/lib/utils";

type AttendanceSessionCardProps = {
  session: AttendanceSessionRow;
  index: number;
  activeLabel?: string;
  idleLabel?: string;
};

const EVENT_ICON: Record<string, typeof LogIn> = {
  login: LogIn,
  logout: LogOut,
  idle_start: Moon,
  idle_end: Zap,
  active: Activity,
};

const EVENT_TONE: Record<string, string> = {
  login: "attendance-timeline__dot--login",
  logout: "attendance-timeline__dot--logout",
  idle_start: "attendance-timeline__dot--idle",
  idle_end: "attendance-timeline__dot--active",
  active: "attendance-timeline__dot--active",
};

function TimelineEvent({ event, isLast }: { event: AttendanceEventRow; isLast: boolean }) {
  const Icon = EVENT_ICON[event.event_type] ?? Clock3;
  const label = ATTENDANCE_EVENT_LABELS[event.event_type] ?? event.event_type;

  return (
    <div className={cn("attendance-timeline__item", isLast && "attendance-timeline__item--last")}>
      <div className="attendance-timeline__rail" aria-hidden>
        <span className={cn("attendance-timeline__dot", EVENT_TONE[event.event_type])}>
          <Icon className="size-3" />
        </span>
        {!isLast ? <span className="attendance-timeline__line" /> : null}
      </div>
      <div className="attendance-timeline__content">
        <p className="attendance-timeline__label">{label}</p>
        <p className="attendance-timeline__time">{formatAttendanceTime(event.created_at)}</p>
      </div>
    </div>
  );
}

export function AttendanceSessionCard({
  session,
  index,
  activeLabel = "Active",
  idleLabel = "Idle",
}: AttendanceSessionCardProps) {
  const stillActive = !session.logout_at;
  const timelineEvents = dedupeAttendanceTimelineEvents(getVisibleAttendanceEvents(session.events));
  const duration = describeSessionDuration(session.login_at, session.logout_at, stillActive);

  return (
    <article className={cn("attendance-session-card", stillActive && "attendance-session-card--live")}>
      <div className="attendance-session-card__main">
        <div className="attendance-session-card__intro">
          <div className="attendance-session-card__title-row">
            <div>
              <p className="attendance-session-card__eyebrow">
                {stillActive ? "Current session" : `Session ${index + 1}`}
              </p>
              <h3 className="attendance-session-card__title">
                {formatAttendanceTime(session.login_at)}
                <span className="attendance-session-card__title-sep">→</span>
                {stillActive ? "Now" : formatAttendanceTime(session.logout_at)}
              </h3>
            </div>
            {stillActive ? <AttendanceStatusBadge status={session.status} /> : null}
          </div>

          <div className="attendance-session-card__chips">
            <span className="attendance-session-chip">
              <Clock3 className="size-3.5" aria-hidden />
              {duration}
            </span>
            <span className="attendance-session-chip attendance-session-chip--active">
              <Activity className="size-3.5" aria-hidden />
              {activeLabel} {formatAttendanceMinutes(session.active_minutes)}
            </span>
            <span className="attendance-session-chip attendance-session-chip--idle">
              <Moon className="size-3.5" aria-hidden />
              {idleLabel} {formatAttendanceMinutes(session.idle_minutes)}
            </span>
          </div>

          {session.last_seen_at ? (
            <p className="attendance-session-card__meta">
              Last activity {formatAttendanceDateTime(session.last_seen_at)}
              {stillActive
                ? ` · Auto-logout after ${Math.floor(ATTENDANCE_STALE_SESSION_SECONDS / 60)} min inactivity`
                : null}
            </p>
          ) : null}
        </div>

        {timelineEvents.length > 0 ? (
          <div className="attendance-session-card__timeline">
            <p className="attendance-session-card__timeline-title">Activity log</p>
            <div className="attendance-timeline">
              {timelineEvents.map((event, eventIndex) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  isLast={eventIndex === timelineEvents.length - 1}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
