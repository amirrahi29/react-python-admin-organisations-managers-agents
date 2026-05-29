from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.attendance import (
    EVENT_ACTIVE,
    EVENT_HEARTBEAT,
    EVENT_IDLE_END,
    EVENT_IDLE_START,
    EVENT_LOGIN,
    EVENT_LOGOUT,
    SESSION_IDLE,
    SESSION_OFFLINE,
    SESSION_ONLINE,
    USER_TYPE_AGENT,
    USER_TYPE_MANAGER,
    AttendanceEvent,
    AttendanceSession,
)
from app.models.manager import Manager
from app.services.organization_scope import admin_agent_ids_subquery, admin_manager_ids_subquery
from app.utils.account_ref import format_account_ref

PRESENCE_ONLINE_SECONDS = 120
STALE_SESSION_SECONDS = 300


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _day_bounds(target: date) -> tuple[datetime, datetime]:
    start = datetime(target.year, target.month, target.day, tzinfo=UTC)
    end = start + timedelta(days=1)
    return start, end


def _add_event(
    db: Session,
    *,
    user_type: str,
    user_id: int,
    event_type: str,
    session_id: int | None = None,
) -> AttendanceEvent:
    event = AttendanceEvent(
        user_type=user_type,
        user_id=user_id,
        event_type=event_type,
        session_id=session_id,
    )
    db.add(event)
    return event


def _close_stale_session(db: Session, session: AttendanceSession) -> bool:
    if session.logout_at is not None:
        return False
    last_seen = session.last_seen_at or session.login_at
    if (_utcnow() - last_seen).total_seconds() <= STALE_SESSION_SECONDS:
        return False

    session.logout_at = last_seen
    session.status = SESSION_OFFLINE
    session.idle_since = None
    if not _session_has_logout_event(db, session.id):
        _add_event(
            db,
            user_type=session.user_type,
            user_id=session.user_id,
            event_type=EVENT_LOGOUT,
            session_id=session.id,
        )
    db.commit()
    return True


def close_stale_sessions(
    db: Session,
    *,
    user_type: str | None = None,
    user_id: int | None = None,
) -> int:
    now = _utcnow()
    cutoff = now - timedelta(seconds=STALE_SESSION_SECONDS)
    query = select(AttendanceSession).where(
        AttendanceSession.logout_at.is_(None),
        func.coalesce(AttendanceSession.last_seen_at, AttendanceSession.login_at) < cutoff,
    )
    if user_type is not None:
        query = query.where(AttendanceSession.user_type == user_type)
    if user_id is not None:
        query = query.where(AttendanceSession.user_id == user_id)

    stale = db.scalars(query).all()
    if not stale:
        return 0

    stale_ids = [session.id for session in stale]
    logged_out_ids = set(
        db.scalars(
            select(AttendanceEvent.session_id).where(
                AttendanceEvent.session_id.in_(stale_ids),
                AttendanceEvent.event_type == EVENT_LOGOUT,
            )
        ).all()
    )

    for session in stale:
        last_seen = session.last_seen_at or session.login_at
        session.logout_at = last_seen
        session.status = SESSION_OFFLINE
        session.idle_since = None
        if session.id not in logged_out_ids:
            _add_event(
                db,
                user_type=session.user_type,
                user_id=session.user_id,
                event_type=EVENT_LOGOUT,
                session_id=session.id,
            )

    db.commit()
    return len(stale)


def get_open_session(db: Session, user_type: str, user_id: int) -> AttendanceSession | None:
    session = db.scalar(
        select(AttendanceSession)
        .where(
            AttendanceSession.user_type == user_type,
            AttendanceSession.user_id == user_id,
            AttendanceSession.logout_at.is_(None),
        )
        .order_by(AttendanceSession.login_at.desc())
        .limit(1)
    )
    if not session:
        return None
    if _close_stale_session(db, session):
        return None
    return session


def _session_has_logout_event(db: Session, session_id: int) -> bool:
    return (
        db.scalar(
            select(AttendanceEvent.id)
            .where(
                AttendanceEvent.session_id == session_id,
                AttendanceEvent.event_type == EVENT_LOGOUT,
            )
            .limit(1)
        )
        is not None
    )


def _record_session_logout(
    db: Session,
    session: AttendanceSession,
    *,
    at: datetime | None = None,
) -> None:
    now = at or _utcnow()
    session.logout_at = session.logout_at or now
    session.status = SESSION_OFFLINE
    session.idle_since = None
    session.last_seen_at = session.last_seen_at or now
    if not _session_has_logout_event(db, session.id):
        _add_event(
            db,
            user_type=session.user_type,
            user_id=session.user_id,
            event_type=EVENT_LOGOUT,
            session_id=session.id,
        )


def close_open_sessions(db: Session, user_type: str, user_id: int, *, at: datetime | None = None) -> None:
    now = at or _utcnow()
    sessions = db.scalars(
        select(AttendanceSession).where(
            AttendanceSession.user_type == user_type,
            AttendanceSession.user_id == user_id,
            AttendanceSession.logout_at.is_(None),
        )
    ).all()
    for session in sessions:
        _record_session_logout(db, session, at=now)


def record_login(db: Session, user_type: str, user_id: int) -> AttendanceSession:
    close_open_sessions(db, user_type, user_id)
    now = _utcnow()
    session = AttendanceSession(
        user_type=user_type,
        user_id=user_id,
        login_at=now,
        last_seen_at=now,
        status=SESSION_ONLINE,
    )
    db.add(session)
    db.flush()
    _add_event(db, user_type=user_type, user_id=user_id, event_type=EVENT_LOGIN, session_id=session.id)
    db.commit()
    db.refresh(session)
    return session


def record_logout(db: Session, user_type: str, user_id: int) -> bool:
    session = get_open_session(db, user_type, user_id)
    if not session:
        return False
    _record_session_logout(db, session)
    db.commit()
    return True


def record_presence(db: Session, user_type: str, user_id: int, event_type: str) -> dict[str, Any]:
    session = get_open_session(db, user_type, user_id)
    if not session:
        session = record_login(db, user_type, user_id)
        return {"session_id": session.id, "status": session.status, "reopened": True}

    now = _utcnow()
    session.last_seen_at = now

    if event_type == EVENT_HEARTBEAT:
        if session.status == SESSION_IDLE and session.idle_since:
            _add_event(
                db,
                user_type=user_type,
                user_id=user_id,
                event_type=EVENT_IDLE_END,
                session_id=session.id,
            )
            session.status = SESSION_ONLINE
            session.idle_since = None
        elif session.status != SESSION_IDLE:
            session.status = SESSION_ONLINE
        # Heartbeats only refresh last_seen_at — they are not stored as timeline events.
    elif event_type == EVENT_IDLE_START:
        if session.status != SESSION_IDLE:
            session.status = SESSION_IDLE
            session.idle_since = now
            _add_event(
                db,
                user_type=user_type,
                user_id=user_id,
                event_type=EVENT_IDLE_START,
                session_id=session.id,
            )
    elif event_type in {EVENT_IDLE_END, EVENT_ACTIVE}:
        if session.status == SESSION_IDLE:
            _add_event(
                db,
                user_type=user_type,
                user_id=user_id,
                event_type=EVENT_IDLE_END,
                session_id=session.id,
            )
        session.status = SESSION_ONLINE
        session.idle_since = None
        _add_event(
            db,
            user_type=user_type,
            user_id=user_id,
            event_type=EVENT_ACTIVE,
            session_id=session.id,
        )
    else:
        raise ValueError(f"Unsupported presence event: {event_type}")

    db.commit()
    db.refresh(session)
    return {"session_id": session.id, "status": session.status, "reopened": False}


def resolve_live_status(session: AttendanceSession | None) -> str:
    if not session or session.logout_at is not None:
        return SESSION_OFFLINE

    last_seen = session.last_seen_at or session.login_at
    seconds_since_seen = (_utcnow() - last_seen).total_seconds()
    if seconds_since_seen > STALE_SESSION_SECONDS:
        return SESSION_OFFLINE
    if session.status == SESSION_IDLE or seconds_since_seen > PRESENCE_ONLINE_SECONDS:
        return SESSION_IDLE
    return SESSION_ONLINE


def _minutes_between(start: datetime | None, end: datetime | None) -> int:
    if not start or not end:
        return 0
    return max(0, int((end - start).total_seconds() // 60))


def _compute_idle_minutes(events: list[AttendanceEvent], *, session_end: datetime | None = None) -> int:
    total = 0
    idle_start: datetime | None = None
    for event in sorted(events, key=lambda item: item.created_at):
        if event.event_type == EVENT_IDLE_START:
            idle_start = event.created_at
        elif event.event_type in {EVENT_IDLE_END, EVENT_ACTIVE, EVENT_LOGOUT} and idle_start:
            total += _minutes_between(idle_start, event.created_at)
            idle_start = None
    if idle_start:
        total += _minutes_between(idle_start, session_end or _utcnow())
    return total


def _serialize_session_summary(
    session: AttendanceSession,
    events: list[AttendanceEvent],
) -> dict[str, Any]:
    end_at = session.logout_at or session.last_seen_at or _utcnow()
    total_minutes = _minutes_between(session.login_at, end_at)
    idle_minutes = _compute_idle_minutes(events, session_end=end_at)
    active_minutes = max(0, total_minutes - idle_minutes)
    return {
        "session_id": session.id,
        "login_at": session.login_at.isoformat(),
        "logout_at": session.logout_at.isoformat() if session.logout_at else None,
        "last_seen_at": session.last_seen_at.isoformat() if session.last_seen_at else None,
        "status": resolve_live_status(session),
        "total_minutes": total_minutes,
        "active_minutes": active_minutes,
        "idle_minutes": idle_minutes,
        "events": [
            {
                "id": event.id,
                "event_type": event.event_type,
                "created_at": event.created_at.isoformat(),
            }
            for event in sorted(events, key=lambda item: item.created_at)
        ],
    }


def _sessions_for_day(db: Session, user_type: str, user_id: int, target: date) -> list[AttendanceSession]:
    start, end = _day_bounds(target)
    return db.scalars(
        select(AttendanceSession)
        .where(
            AttendanceSession.user_type == user_type,
            AttendanceSession.user_id == user_id,
            AttendanceSession.login_at >= start,
            AttendanceSession.login_at < end,
        )
        .order_by(AttendanceSession.login_at.asc())
    ).all()


def _events_for_sessions(db: Session, session_ids: list[int]) -> dict[int, list[AttendanceEvent]]:
    if not session_ids:
        return {}
    events = db.scalars(
        select(AttendanceEvent)
        .where(AttendanceEvent.session_id.in_(session_ids))
        .order_by(AttendanceEvent.created_at.asc())
    ).all()
    grouped: dict[int, list[AttendanceEvent]] = {}
    for event in events:
        if event.session_id is None:
            continue
        grouped.setdefault(event.session_id, []).append(event)
    return grouped


def get_user_attendance_detail(
    db: Session,
    *,
    user_type: str,
    user_id: int,
    target: date,
) -> dict[str, Any]:
    sessions = _sessions_for_day(db, user_type, user_id, target)
    open_session = get_open_session(db, user_type, user_id)
    if open_session and open_session not in sessions:
        session_day = open_session.login_at.date()
        if session_day == target:
            sessions.append(open_session)
            sessions.sort(key=lambda item: item.login_at)

    session_ids = [session.id for session in sessions]
    grouped_events = _events_for_sessions(db, session_ids)
    serialized_sessions = [
        _serialize_session_summary(session, grouped_events.get(session.id, []))
        for session in sessions
    ]
    serialized_sessions.sort(key=lambda item: item["login_at"], reverse=True)

    total_minutes = sum(item["total_minutes"] for item in serialized_sessions)
    active_minutes = sum(item["active_minutes"] for item in serialized_sessions)
    idle_minutes = sum(item["idle_minutes"] for item in serialized_sessions)
    first_login = min((session.login_at for session in sessions), default=None)
    last_logout_at = max((session.logout_at for session in sessions if session.logout_at), default=None)
    first_login = first_login.isoformat() if first_login else None
    last_logout = last_logout_at.isoformat() if last_logout_at else None

    return {
        "date": target.isoformat(),
        "user_type": user_type,
        "user_id": user_id,
        "live_status": resolve_live_status(open_session),
        "first_login": first_login,
        "last_logout": last_logout,
        "total_minutes": total_minutes,
        "active_minutes": active_minutes,
        "idle_minutes": idle_minutes,
        "sessions": serialized_sessions,
    }


def _summary_row(
    *,
    account_id: str,
    name: str,
    email: str,
    user_type: str,
    user_id: int,
    open_session: AttendanceSession | None,
    day_sessions: list[AttendanceSession],
    grouped_events: dict[int, list[AttendanceEvent]],
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    total_minutes = 0
    active_minutes = 0
    idle_minutes = 0
    first_login: datetime | None = None
    last_logout: datetime | None = None

    for session in day_sessions:
        events = grouped_events.get(session.id, [])
        end_at = session.logout_at or session.last_seen_at or _utcnow()
        session_total = _minutes_between(session.login_at, end_at)
        session_idle = _compute_idle_minutes(events, session_end=end_at)
        total_minutes += session_total
        idle_minutes += session_idle
        active_minutes += max(0, session_total - session_idle)
        if first_login is None or session.login_at < first_login:
            first_login = session.login_at
        if session.logout_at and (last_logout is None or session.logout_at > last_logout):
            last_logout = session.logout_at

    row = {
        "account_id": account_id,
        "name": name,
        "email": email,
        "user_type": user_type,
        "user_id": user_id,
        "live_status": resolve_live_status(open_session),
        "first_login": first_login.isoformat() if first_login else None,
        "last_logout": last_logout.isoformat() if last_logout else None,
        "session_count": len(day_sessions),
        "total_minutes": total_minutes,
        "active_minutes": active_minutes,
        "idle_minutes": idle_minutes,
    }
    if extra:
        row.update(extra)
    return row


def _open_sessions_map(
    db: Session, user_type: str, user_ids: list[int]
) -> dict[int, AttendanceSession]:
    if not user_ids:
        return {}
    sessions = db.scalars(
        select(AttendanceSession)
        .where(
            AttendanceSession.user_type == user_type,
            AttendanceSession.user_id.in_(user_ids),
            AttendanceSession.logout_at.is_(None),
        )
        .order_by(AttendanceSession.user_id.asc(), AttendanceSession.login_at.desc())
    ).all()
    open_by_user: dict[int, AttendanceSession] = {}
    for session in sessions:
        if session.user_id not in open_by_user:
            open_by_user[session.user_id] = session
    return open_by_user


def _day_sessions_map(
    db: Session, user_type: str, user_ids: list[int], target: date
) -> dict[int, list[AttendanceSession]]:
    if not user_ids:
        return {}
    start, end = _day_bounds(target)
    sessions = db.scalars(
        select(AttendanceSession).where(
            AttendanceSession.user_type == user_type,
            AttendanceSession.user_id.in_(user_ids),
            AttendanceSession.login_at >= start,
            AttendanceSession.login_at < end,
        )
    ).all()
    grouped: dict[int, list[AttendanceSession]] = {user_id: [] for user_id in user_ids}
    for session in sessions:
        grouped.setdefault(session.user_id, []).append(session)
    return grouped


def _attendance_summary_rows(
    *,
    members: list[tuple[str, str, str, int]],
    user_type: str,
    day_sessions: dict[int, list[AttendanceSession]],
    open_sessions: dict[int, AttendanceSession],
    grouped_events: dict[int, list[AttendanceEvent]],
    extra_for: dict[int, dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for account_id, name, email, user_id in members:
        rows.append(
            _summary_row(
                account_id=account_id,
                name=name,
                email=email,
                user_type=user_type,
                user_id=user_id,
                open_session=open_sessions.get(user_id),
                day_sessions=day_sessions.get(user_id, []),
                grouped_events=grouped_events,
                extra=(extra_for or {}).get(user_id),
            )
        )
    return rows


def list_manager_attendance_for_admin(db: Session, admin_id: int, target: date) -> list[dict[str, Any]]:
    managers = db.scalars(
        select(Manager).where(Manager.id.in_(admin_manager_ids_subquery(admin_id))).order_by(Manager.name.asc())
    ).all()
    if not managers:
        return []

    user_ids = [manager.id for manager in managers]
    day_sessions = _day_sessions_map(db, USER_TYPE_MANAGER, user_ids, target)
    open_sessions = _open_sessions_map(db, USER_TYPE_MANAGER, user_ids)
    session_ids = [
        session.id for sessions in day_sessions.values() for session in sessions
    ]
    grouped_events = _events_for_sessions(db, session_ids)
    members = [
        (
            format_account_ref(role=USER_TYPE_MANAGER, member_id=manager.id),
            manager.name,
            manager.email,
            manager.id,
        )
        for manager in managers
    ]
    extra_for = {manager.id: {"is_active": manager.is_active == 1} for manager in managers}
    return _attendance_summary_rows(
        members=members,
        user_type=USER_TYPE_MANAGER,
        day_sessions=day_sessions,
        open_sessions=open_sessions,
        grouped_events=grouped_events,
        extra_for=extra_for,
    )


def list_agent_attendance_for_admin(db: Session, admin_id: int, target: date) -> list[dict[str, Any]]:
    agents = db.scalars(
        select(Agent)
        .where(Agent.id.in_(admin_agent_ids_subquery(admin_id)))
        .order_by(Agent.name.asc())
    ).all()
    if not agents:
        return []

    manager_names = {
        manager.id: manager.name
        for manager in db.scalars(
            select(Manager).where(Manager.id.in_(admin_manager_ids_subquery(admin_id)))
        ).all()
    }
    user_ids = [agent.id for agent in agents]
    day_sessions = _day_sessions_map(db, USER_TYPE_AGENT, user_ids, target)
    open_sessions = _open_sessions_map(db, USER_TYPE_AGENT, user_ids)
    session_ids = [
        session.id for sessions in day_sessions.values() for session in sessions
    ]
    grouped_events = _events_for_sessions(db, session_ids)
    members = [
        (
            format_account_ref(role=USER_TYPE_AGENT, member_id=agent.id),
            agent.name,
            agent.email,
            agent.id,
        )
        for agent in agents
    ]
    extra_for = {
        agent.id: {
            "manager_name": manager_names.get(agent.manager_id),
            "is_active": agent.is_active == 1,
        }
        for agent in agents
    }
    return _attendance_summary_rows(
        members=members,
        user_type=USER_TYPE_AGENT,
        day_sessions=day_sessions,
        open_sessions=open_sessions,
        grouped_events=grouped_events,
        extra_for=extra_for,
    )


def list_agent_attendance_for_manager(db: Session, manager_id: int, target: date) -> list[dict[str, Any]]:
    agents = db.scalars(
        select(Agent).where(Agent.manager_id == manager_id).order_by(Agent.name.asc())
    ).all()
    if not agents:
        return []

    user_ids = [agent.id for agent in agents]
    day_sessions = _day_sessions_map(db, USER_TYPE_AGENT, user_ids, target)
    open_sessions = _open_sessions_map(db, USER_TYPE_AGENT, user_ids)
    session_ids = [
        session.id for sessions in day_sessions.values() for session in sessions
    ]
    grouped_events = _events_for_sessions(db, session_ids)
    members = [
        (
            format_account_ref(role=USER_TYPE_AGENT, member_id=agent.id),
            agent.name,
            agent.email,
            agent.id,
        )
        for agent in agents
    ]
    extra_for = {agent.id: {"is_active": agent.is_active == 1} for agent in agents}
    return _attendance_summary_rows(
        members=members,
        user_type=USER_TYPE_AGENT,
        day_sessions=day_sessions,
        open_sessions=open_sessions,
        grouped_events=grouped_events,
        extra_for=extra_for,
    )


def get_agent_for_manager_attendance(db: Session, manager_id: int, agent_id: int) -> Agent | None:
    return db.scalar(
        select(Agent).where(Agent.id == agent_id, Agent.manager_id == manager_id)
    )


def get_agent_for_admin_attendance(db: Session, admin_id: int, agent_id: int) -> Agent | None:
    return db.scalar(
        select(Agent).where(Agent.id == agent_id, Agent.id.in_(admin_agent_ids_subquery(admin_id)))
    )


def get_manager_for_admin_attendance(db: Session, admin_id: int, manager_id: int) -> Manager | None:
    return db.scalar(
        select(Manager).where(Manager.id == manager_id, Manager.id.in_(admin_manager_ids_subquery(admin_id)))
    )

