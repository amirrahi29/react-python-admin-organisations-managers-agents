from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admin import Admin
from app.models.agent import Agent
from app.models.leave import (
    DURATION_FULL,
    DURATION_HALF,
    DURATION_TYPES,
    LEAVE_TYPES,
    REQUESTER_AGENT,
    REQUESTER_MANAGER,
    REVIEWER_ADMIN,
    REVIEWER_MANAGER,
    STATUS_APPROVED,
    STATUS_DECLINED,
    STATUS_PENDING,
    LeaveRequest,
)
from app.models.manager import Manager
from app.models.organization import Organization
from app.services.organization_scope import admin_agent_ids_subquery, admin_manager_ids_subquery
from app.services.email import (
    send_leave_cancelled_email,
    send_leave_reviewed_email,
    send_leave_submitted_email,
    send_leave_updated_email,
)
from app.utils.account_ref import format_account_ref

ACTIVE_STATUSES = {STATUS_PENDING, STATUS_APPROVED}


def _reviewer_contact(
    db: Session,
    reviewer_type: str | None,
    reviewer_id: int | None,
) -> tuple[str | None, str | None]:
    if not reviewer_type or reviewer_id is None:
        return None, None
    if reviewer_type == REVIEWER_MANAGER:
        manager = db.get(Manager, reviewer_id)
        return (manager.email, manager.name) if manager else (None, None)
    if reviewer_type == REVIEWER_ADMIN:
        admin = db.get(Admin, reviewer_id)
        return (admin.email, admin.name) if admin else (None, None)
    return None, None


def _notify_leave_submitted(
    db: Session,
    *,
    leave: LeaveRequest,
    requester_name: str,
) -> None:
    reviewer_email, reviewer_name = _reviewer_contact(
        db,
        leave.assigned_reviewer_type,
        leave.assigned_reviewer_id,
    )
    if not reviewer_email or not reviewer_name:
        return
    send_leave_submitted_email(
        reviewer_email=reviewer_email,
        reviewer_name=reviewer_name,
        requester_name=requester_name,
        reviewer_role=leave.assigned_reviewer_type or REVIEWER_MANAGER,
        leave_type=leave.leave_type,
        duration_type=leave.duration_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        working_days=float(leave.working_days),
        reason=leave.reason,
    )


def _notify_leave_updated(
    db: Session,
    *,
    leave: LeaveRequest,
    requester_name: str,
) -> None:
    reviewer_email, reviewer_name = _reviewer_contact(
        db,
        leave.assigned_reviewer_type,
        leave.assigned_reviewer_id,
    )
    if not reviewer_email or not reviewer_name:
        return
    send_leave_updated_email(
        reviewer_email=reviewer_email,
        reviewer_name=reviewer_name,
        requester_name=requester_name,
        reviewer_role=leave.assigned_reviewer_type or REVIEWER_MANAGER,
        leave_type=leave.leave_type,
        duration_type=leave.duration_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        working_days=float(leave.working_days),
        reason=leave.reason,
    )


def _notify_leave_cancelled(
    db: Session,
    *,
    leave: LeaveRequest,
    requester_name: str,
) -> None:
    reviewer_email, reviewer_name = _reviewer_contact(
        db,
        leave.assigned_reviewer_type,
        leave.assigned_reviewer_id,
    )
    if not reviewer_email or not reviewer_name:
        return
    send_leave_cancelled_email(
        reviewer_email=reviewer_email,
        reviewer_name=reviewer_name,
        requester_name=requester_name,
    )


def _notify_leave_reviewed(
    db: Session,
    *,
    leave: LeaveRequest,
    requester_email: str | None,
    requester_name: str | None,
    requester_role: str,
    approved: bool,
    reviewer_name: str,
) -> None:
    if not requester_email or not requester_name:
        return
    send_leave_reviewed_email(
        requester_email=requester_email,
        requester_name=requester_name,
        requester_role=requester_role,
        approved=approved,
        reviewer_name=reviewer_name,
        leave_type=leave.leave_type,
        duration_type=leave.duration_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        working_days=float(leave.working_days),
        reason=leave.reason,
        review_note=leave.review_note,
    )


def _month_bounds(month: str) -> tuple[date, date]:
    year, mon = map(int, month.split("-", 1))
    start = date(year, mon, 1)
    end = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)
    return start, end


def summarize_leave_items(items: list[dict[str, Any]]) -> dict[str, Any]:
    approved = [item for item in items if item["status"] == STATUS_APPROVED]
    return {
        "total": len(items),
        "pending": sum(1 for item in items if item["status"] == STATUS_PENDING),
        "approved": len(approved),
        "declined": sum(1 for item in items if item["status"] == STATUS_DECLINED),
        "approved_working_days": round(sum(float(item["working_days"]) for item in approved), 1),
    }


def build_leave_history_response(*, month: str | None, items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "month": month,
        "summary": summarize_leave_items(items),
        "items": items,
    }


def _utcnow() -> datetime:
    return datetime.now(UTC)


def iter_leave_dates(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def _today() -> date:
    return datetime.now(UTC).date()


def calculate_leave_days(start: date, end: date, duration_type: str = DURATION_FULL) -> dict[str, Any]:
    if duration_type == DURATION_HALF:
        if start != end:
            raise ValueError("Half-day leave must be for one date only.")
        if start.weekday() >= 5:
            raise ValueError("Half-day leave must be on a working day (Mon–Fri).")
        return {
            "calendar_days": 1,
            "working_days": 0.5,
            "weekend_days": 0,
            "weekend_dates": [],
            "duration_type": DURATION_HALF,
        }

    calendar_days = 0
    working_days = 0
    weekend_days = 0
    weekend_dates: list[str] = []

    for day in iter_leave_dates(start, end):
        calendar_days += 1
        if day.weekday() >= 5:
            weekend_days += 1
            weekend_dates.append(day.isoformat())
        else:
            working_days += 1

    return {
        "calendar_days": calendar_days,
        "working_days": float(working_days),
        "weekend_days": weekend_days,
        "weekend_dates": weekend_dates,
        "duration_type": DURATION_FULL,
    }


def validate_leave_dates(start: date, end: date, duration_type: str = DURATION_FULL) -> str | None:
    today = _today()
    if start <= today:
        return "Leave can only be applied for future dates. Today and past dates are not allowed."
    if end <= today:
        return "Leave can only be applied for future dates. Today and past dates are not allowed."
    if end < start:
        return "End date must be on or after start date."
    if duration_type == DURATION_HALF:
        if start != end:
            return "Half-day leave must be for one date only."
        if start.weekday() >= 5:
            return "Half-day leave must be on a working day (Mon–Fri)."
        return None
    if working_days_only(start, end) == 0:
        return "Leave must include at least one working day (Mon–Fri). Weekends (Sat–Sun) are excluded from leave count."
    return None


def validate_duration_type(duration_type: str) -> str | None:
    if duration_type not in DURATION_TYPES:
        return "Invalid leave duration. Choose full day or half day."
    return None


def working_days_only(start: date, end: date) -> float:
    return float(calculate_leave_days(start, end, DURATION_FULL)["working_days"])


def _has_overlap(
    db: Session,
    *,
    requester_type: str,
    requester_id: int,
    start: date,
    end: date,
    exclude_id: int | None = None,
) -> bool:
    query = select(LeaveRequest.id).where(
        LeaveRequest.requester_type == requester_type,
        LeaveRequest.requester_id == requester_id,
        LeaveRequest.status.in_(tuple(ACTIVE_STATUSES)),
        LeaveRequest.start_date <= end,
        LeaveRequest.end_date >= start,
    )
    if exclude_id is not None:
        query = query.where(LeaveRequest.id != exclude_id)
    return db.scalar(query.limit(1)) is not None


def _reviewer_name(db: Session, reviewer_type: str | None, reviewer_id: int | None) -> str | None:
    if not reviewer_type or reviewer_id is None:
        return None
    if reviewer_type == REVIEWER_MANAGER:
        manager = db.get(Manager, reviewer_id)
        return manager.name if manager else None
    if reviewer_type == REVIEWER_ADMIN:
        admin = db.get(Admin, reviewer_id)
        return admin.name if admin else "Admin"
    return None


def _bulk_reviewer_map(
    db: Session, leaves: list[LeaveRequest]
) -> dict[tuple[str, int], str]:
    """Resolve assigned-reviewer names for a batch of leaves in 2 queries.

    Replaces a per-row ``db.get(Manager | Admin, …)`` lookup with two grouped
    SELECTs (one per reviewer table). Returns a lookup keyed by
    ``(reviewer_type, reviewer_id)``.
    """
    manager_ids: set[int] = set()
    admin_ids: set[int] = set()
    for leave in leaves:
        if not leave.assigned_reviewer_type or leave.assigned_reviewer_id is None:
            continue
        if leave.assigned_reviewer_type == REVIEWER_MANAGER:
            manager_ids.add(leave.assigned_reviewer_id)
        elif leave.assigned_reviewer_type == REVIEWER_ADMIN:
            admin_ids.add(leave.assigned_reviewer_id)

    out: dict[tuple[str, int], str] = {}
    if manager_ids:
        for mid, name in db.execute(
            select(Manager.id, Manager.name).where(Manager.id.in_(manager_ids))
        ).all():
            out[(REVIEWER_MANAGER, int(mid))] = name
    if admin_ids:
        for aid, name in db.execute(
            select(Admin.id, Admin.name).where(Admin.id.in_(admin_ids))
        ).all():
            out[(REVIEWER_ADMIN, int(aid))] = name or "Admin"
    return out


def _bulk_requester_agent_map(
    db: Session, leaves: list[LeaveRequest]
) -> dict[int, Agent]:
    ids = {leave.requester_id for leave in leaves if leave.requester_type == REQUESTER_AGENT}
    if not ids:
        return {}
    rows = db.scalars(select(Agent).where(Agent.id.in_(ids))).all()
    return {row.id: row for row in rows}


def _bulk_requester_manager_map(
    db: Session, leaves: list[LeaveRequest]
) -> dict[int, Manager]:
    ids = {leave.requester_id for leave in leaves if leave.requester_type == REQUESTER_MANAGER}
    if not ids:
        return {}
    rows = db.scalars(select(Manager).where(Manager.id.in_(ids))).all()
    return {row.id: row for row in rows}


def _resolve_assigned_reviewer(
    db: Session,
    *,
    requester_type: str,
    requester_id: int,
) -> tuple[str, int, str]:
    if requester_type == REQUESTER_AGENT:
        agent = db.get(Agent, requester_id)
        if not agent:
            raise ValueError("Agent not found.")
        manager = db.get(Manager, agent.manager_id)
        if not manager:
            raise ValueError("You must be assigned to a manager before applying for leave.")
        return REVIEWER_MANAGER, manager.id, manager.name

    manager = db.get(Manager, requester_id)
    if not manager:
        raise ValueError("Manager not found.")
    org = db.get(Organization, manager.organization_id) if manager.organization_id else None
    if not org:
        raise ValueError("Manager organization is missing.")
    admin = db.get(Admin, org.admin_id)
    admin_name = admin.name if admin else "Admin"
    return REVIEWER_ADMIN, org.admin_id, admin_name


def get_agent_leave_routing(db: Session, agent_id: int) -> dict[str, Any]:
    reviewer_type, reviewer_id, reviewer_name = _resolve_assigned_reviewer(
        db,
        requester_type=REQUESTER_AGENT,
        requester_id=agent_id,
    )
    manager = db.get(Manager, reviewer_id)
    return {
        "approver_type": reviewer_type,
        "approver_id": reviewer_id,
        "approver_name": reviewer_name,
        "approver_email": manager.email if manager else None,
    }


def get_manager_leave_routing(db: Session, manager_id: int) -> dict[str, Any]:
    reviewer_type, reviewer_id, reviewer_name = _resolve_assigned_reviewer(
        db,
        requester_type=REQUESTER_MANAGER,
        requester_id=manager_id,
    )
    admin = db.get(Admin, reviewer_id)
    return {
        "approver_type": reviewer_type,
        "approver_id": reviewer_id,
        "approver_name": reviewer_name,
        "approver_email": admin.email if admin else None,
    }


def _serialize_leave(
    leave: LeaveRequest,
    *,
    requester_name: str | None = None,
    requester_email: str | None = None,
    requester_account_id: str | None = None,
    manager_name: str | None = None,
    extra: dict[str, Any] | None = None,
    db: Session | None = None,
    reviewer_map: dict[tuple[str, int], str] | None = None,
) -> dict[str, Any]:
    day_breakdown = calculate_leave_days(leave.start_date, leave.end_date, leave.duration_type)
    assigned_reviewer_name = None
    if leave.assigned_reviewer_type and leave.assigned_reviewer_id is not None:
        if reviewer_map is not None:
            assigned_reviewer_name = reviewer_map.get(
                (leave.assigned_reviewer_type, leave.assigned_reviewer_id)
            )
        elif db:
            assigned_reviewer_name = _reviewer_name(
                db, leave.assigned_reviewer_type, leave.assigned_reviewer_id
            )
    row = {
        "id": leave.id,
        "requester_type": leave.requester_type,
        "requester_id": leave.requester_id,
        "requester_name": requester_name,
        "requester_email": requester_email,
        "requester_account_id": requester_account_id,
        "start_date": leave.start_date.isoformat(),
        "end_date": leave.end_date.isoformat(),
        "leave_type": leave.leave_type,
        "duration_type": leave.duration_type,
        "reason": leave.reason,
        "status": leave.status,
        "calendar_days": leave.calendar_days,
        "working_days": float(leave.working_days),
        "weekend_days": leave.weekend_days,
        "weekend_dates": day_breakdown["weekend_dates"],
        "reviewed_by_type": leave.reviewed_by_type,
        "reviewed_by_id": leave.reviewed_by_id,
        "review_note": leave.review_note,
        "reviewed_at": leave.reviewed_at.isoformat() if leave.reviewed_at else None,
        "created_at": leave.created_at.isoformat() if leave.created_at else None,
        "updated_at": leave.updated_at.isoformat() if leave.updated_at else None,
        "manager_name": manager_name,
        "assigned_reviewer_type": leave.assigned_reviewer_type,
        "assigned_reviewer_id": leave.assigned_reviewer_id,
        "assigned_reviewer_name": assigned_reviewer_name,
        "can_edit": leave.status == STATUS_PENDING,
        "can_delete": leave.status == STATUS_PENDING,
    }
    if extra:
        row.update(extra)
    return row


def list_agent_leaves(db: Session, agent_id: int) -> list[dict[str, Any]]:
    agent = db.get(Agent, agent_id)
    if not agent:
        return []
    leaves = db.scalars(
        select(LeaveRequest)
        .where(LeaveRequest.requester_type == REQUESTER_AGENT, LeaveRequest.requester_id == agent_id)
        .order_by(LeaveRequest.created_at.desc())
    ).all()
    reviewer_map = _bulk_reviewer_map(db, list(leaves))
    return [
        _serialize_leave(
            leave,
            requester_name=agent.name,
            requester_email=agent.email,
            requester_account_id=format_account_ref(role=REQUESTER_AGENT, member_id=agent.id),
            reviewer_map=reviewer_map,
        )
        for leave in leaves
    ]


def list_manager_leaves(db: Session, manager_id: int) -> list[dict[str, Any]]:
    manager = db.get(Manager, manager_id)
    if not manager:
        return []
    leaves = db.scalars(
        select(LeaveRequest)
        .where(LeaveRequest.requester_type == REQUESTER_MANAGER, LeaveRequest.requester_id == manager_id)
        .order_by(LeaveRequest.created_at.desc())
    ).all()
    reviewer_map = _bulk_reviewer_map(db, list(leaves))
    return [
        _serialize_leave(
            leave,
            requester_name=manager.name,
            requester_email=manager.email,
            requester_account_id=format_account_ref(role=REQUESTER_MANAGER, member_id=manager.id),
            reviewer_map=reviewer_map,
        )
        for leave in leaves
    ]


def create_leave(
    db: Session,
    *,
    requester_type: str,
    requester_id: int,
    start_date: date,
    end_date: date,
    leave_type: str,
    reason: str,
    duration_type: str = DURATION_FULL,
) -> dict[str, Any]:
    if leave_type not in LEAVE_TYPES:
        raise ValueError("Invalid leave type.")
    duration_error = validate_duration_type(duration_type)
    if duration_error:
        raise ValueError(duration_error)
    date_error = validate_leave_dates(start_date, end_date, duration_type)
    if date_error:
        raise ValueError(date_error)
    trimmed_reason = reason.strip()
    if len(trimmed_reason) < 3:
        raise ValueError("Reason is required.")

    if _has_overlap(
        db,
        requester_type=requester_type,
        requester_id=requester_id,
        start=start_date,
        end=end_date,
    ):
        raise ValueError("This date range overlaps with an existing pending or approved leave.")

    breakdown = calculate_leave_days(start_date, end_date, duration_type)
    reviewer_type, reviewer_id, _reviewer_label = _resolve_assigned_reviewer(
        db,
        requester_type=requester_type,
        requester_id=requester_id,
    )
    leave = LeaveRequest(
        requester_type=requester_type,
        requester_id=requester_id,
        start_date=start_date,
        end_date=end_date,
        leave_type=leave_type,
        duration_type=duration_type,
        reason=trimmed_reason,
        status=STATUS_PENDING,
        calendar_days=breakdown["calendar_days"],
        working_days=breakdown["working_days"],
        weekend_days=breakdown["weekend_days"],
        assigned_reviewer_type=reviewer_type,
        assigned_reviewer_id=reviewer_id,
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)

    if requester_type == REQUESTER_AGENT:
        agent = db.get(Agent, requester_id)
        requester_name = agent.name if agent else "Team member"
        _notify_leave_submitted(db, leave=leave, requester_name=requester_name)
        return _serialize_leave(
            leave,
            requester_name=agent.name if agent else None,
            requester_email=agent.email if agent else None,
            requester_account_id=format_account_ref(role=REQUESTER_AGENT, member_id=requester_id),
            db=db,
        )
    manager = db.get(Manager, requester_id)
    requester_name = manager.name if manager else "Team member"
    _notify_leave_submitted(db, leave=leave, requester_name=requester_name)
    return _serialize_leave(
        leave,
        requester_name=manager.name if manager else None,
        requester_email=manager.email if manager else None,
        requester_account_id=format_account_ref(role=REQUESTER_MANAGER, member_id=requester_id),
        db=db,
    )


def update_leave(
    db: Session,
    *,
    leave_id: int,
    requester_type: str,
    requester_id: int,
    start_date: date,
    end_date: date,
    leave_type: str,
    reason: str,
    duration_type: str = DURATION_FULL,
) -> dict[str, Any]:
    leave = db.get(LeaveRequest, leave_id)
    if not leave or leave.requester_type != requester_type or leave.requester_id != requester_id:
        raise LookupError("Leave request not found.")
    if leave.status != STATUS_PENDING:
        raise ValueError("Only pending leave requests can be edited.")

    if leave_type not in LEAVE_TYPES:
        raise ValueError("Invalid leave type.")
    duration_error = validate_duration_type(duration_type)
    if duration_error:
        raise ValueError(duration_error)
    date_error = validate_leave_dates(start_date, end_date, duration_type)
    if date_error:
        raise ValueError(date_error)
    trimmed_reason = reason.strip()
    if len(trimmed_reason) < 3:
        raise ValueError("Reason is required.")

    if _has_overlap(
        db,
        requester_type=requester_type,
        requester_id=requester_id,
        start=start_date,
        end=end_date,
        exclude_id=leave_id,
    ):
        raise ValueError("This date range overlaps with an existing pending or approved leave.")

    breakdown = calculate_leave_days(start_date, end_date, duration_type)
    leave.start_date = start_date
    leave.end_date = end_date
    leave.leave_type = leave_type
    leave.duration_type = duration_type
    leave.reason = trimmed_reason
    leave.calendar_days = breakdown["calendar_days"]
    leave.working_days = breakdown["working_days"]
    leave.weekend_days = breakdown["weekend_days"]
    leave.updated_at = _utcnow()
    db.commit()
    db.refresh(leave)

    if requester_type == REQUESTER_AGENT:
        agent = db.get(Agent, requester_id)
        requester_name = agent.name if agent else "Team member"
        _notify_leave_updated(db, leave=leave, requester_name=requester_name)
        return _serialize_leave(
            leave,
            requester_name=agent.name if agent else None,
            requester_email=agent.email if agent else None,
            requester_account_id=format_account_ref(role=REQUESTER_AGENT, member_id=requester_id),
            db=db,
        )
    manager = db.get(Manager, requester_id)
    requester_name = manager.name if manager else "Team member"
    _notify_leave_updated(db, leave=leave, requester_name=requester_name)
    return _serialize_leave(
        leave,
        requester_name=manager.name if manager else None,
        requester_email=manager.email if manager else None,
        requester_account_id=format_account_ref(role=REQUESTER_MANAGER, member_id=requester_id),
        db=db,
    )


def delete_leave(db: Session, *, leave_id: int, requester_type: str, requester_id: int) -> None:
    leave = db.get(LeaveRequest, leave_id)
    if not leave or leave.requester_type != requester_type or leave.requester_id != requester_id:
        raise LookupError("Leave request not found.")
    if leave.status != STATUS_PENDING:
        raise ValueError("Only pending leave requests can be deleted.")

    requester_name = "Team member"
    if leave.requester_type == REQUESTER_AGENT:
        agent = db.get(Agent, leave.requester_id)
        requester_name = agent.name if agent else requester_name
    elif leave.requester_type == REQUESTER_MANAGER:
        manager = db.get(Manager, leave.requester_id)
        requester_name = manager.name if manager else requester_name
    _notify_leave_cancelled(db, leave=leave, requester_name=requester_name)

    db.delete(leave)
    db.commit()


def list_pending_agent_leaves_for_manager(db: Session, manager_id: int) -> list[dict[str, Any]]:
    leaves = list(
        db.scalars(
            select(LeaveRequest)
            .where(
                LeaveRequest.requester_type == REQUESTER_AGENT,
                LeaveRequest.assigned_reviewer_type == REVIEWER_MANAGER,
                LeaveRequest.assigned_reviewer_id == manager_id,
                LeaveRequest.status == STATUS_PENDING,
            )
            .order_by(LeaveRequest.created_at.asc())
        ).all()
    )
    agents = _bulk_requester_agent_map(db, leaves)
    reviewer_map = _bulk_reviewer_map(db, leaves)
    rows: list[dict[str, Any]] = []
    for leave in leaves:
        agent = agents.get(leave.requester_id)
        if not agent:
            continue
        rows.append(
            _serialize_leave(
                leave,
                requester_name=agent.name,
                requester_email=agent.email,
                requester_account_id=format_account_ref(role=REQUESTER_AGENT, member_id=agent.id),
                reviewer_map=reviewer_map,
            )
        )
    return rows


def list_pending_manager_leaves_for_admin(db: Session, admin_id: int) -> list[dict[str, Any]]:
    leaves = list(
        db.scalars(
            select(LeaveRequest)
            .where(
                LeaveRequest.requester_type == REQUESTER_MANAGER,
                LeaveRequest.assigned_reviewer_type == REVIEWER_ADMIN,
                LeaveRequest.assigned_reviewer_id == admin_id,
                LeaveRequest.status == STATUS_PENDING,
            )
            .order_by(LeaveRequest.created_at.asc())
        ).all()
    )
    managers = _bulk_requester_manager_map(db, leaves)
    reviewer_map = _bulk_reviewer_map(db, leaves)
    rows: list[dict[str, Any]] = []
    for leave in leaves:
        manager = managers.get(leave.requester_id)
        if not manager:
            continue
        rows.append(
            _serialize_leave(
                leave,
                requester_name=manager.name,
                requester_email=manager.email,
                requester_account_id=format_account_ref(role=REQUESTER_MANAGER, member_id=manager.id),
                reviewer_map=reviewer_map,
            )
        )
    return rows


def list_agent_leaves_for_manager(
    db: Session,
    manager_id: int,
    *,
    month: str | None = None,
) -> list[dict[str, Any]]:
    query = (
        select(LeaveRequest)
        .where(
            LeaveRequest.requester_type == REQUESTER_AGENT,
            LeaveRequest.assigned_reviewer_type == REVIEWER_MANAGER,
            LeaveRequest.assigned_reviewer_id == manager_id,
        )
        .order_by(LeaveRequest.start_date.desc(), LeaveRequest.created_at.desc())
    )
    if month:
        month_start, month_end = _month_bounds(month)
        query = query.where(
            LeaveRequest.start_date >= month_start,
            LeaveRequest.start_date < month_end,
        )

    leaves = list(db.scalars(query).all())
    agents = _bulk_requester_agent_map(db, leaves)
    reviewer_map = _bulk_reviewer_map(db, leaves)
    rows: list[dict[str, Any]] = []
    for leave in leaves:
        agent = agents.get(leave.requester_id)
        if not agent:
            continue
        rows.append(
            _serialize_leave(
                leave,
                requester_name=agent.name,
                requester_email=agent.email,
                requester_account_id=format_account_ref(role=REQUESTER_AGENT, member_id=agent.id),
                reviewer_map=reviewer_map,
            )
        )
    return rows


def list_manager_leaves_for_admin(
    db: Session,
    admin_id: int,
    *,
    month: str | None = None,
) -> list[dict[str, Any]]:
    query = (
        select(LeaveRequest)
        .where(
            LeaveRequest.requester_type == REQUESTER_MANAGER,
            LeaveRequest.assigned_reviewer_type == REVIEWER_ADMIN,
            LeaveRequest.assigned_reviewer_id == admin_id,
        )
        .order_by(LeaveRequest.start_date.desc(), LeaveRequest.created_at.desc())
    )
    if month:
        month_start, month_end = _month_bounds(month)
        query = query.where(
            LeaveRequest.start_date >= month_start,
            LeaveRequest.start_date < month_end,
        )

    leaves = list(db.scalars(query).all())
    managers = _bulk_requester_manager_map(db, leaves)
    reviewer_map = _bulk_reviewer_map(db, leaves)
    rows: list[dict[str, Any]] = []
    for leave in leaves:
        manager = managers.get(leave.requester_id)
        if not manager:
            continue
        rows.append(
            _serialize_leave(
                leave,
                requester_name=manager.name,
                requester_email=manager.email,
                requester_account_id=format_account_ref(role=REQUESTER_MANAGER, member_id=manager.id),
                reviewer_map=reviewer_map,
            )
        )
    return rows


def list_all_agent_leaves_for_admin(db: Session, admin_id: int, *, month: str | None = None) -> list[dict[str, Any]]:
    agents = db.scalars(select(Agent).where(Agent.id.in_(admin_agent_ids_subquery(admin_id)))).all()
    if not agents:
        return []
    agent_map = {agent.id: agent for agent in agents}
    manager_names = {
        manager.id: manager.name
        for manager in db.scalars(
            select(Manager).where(Manager.id.in_(admin_manager_ids_subquery(admin_id)))
        ).all()
    }
    query = (
        select(LeaveRequest)
        .where(
            LeaveRequest.requester_type == REQUESTER_AGENT,
            LeaveRequest.requester_id.in_(agent_map.keys()),
        )
        .order_by(LeaveRequest.start_date.desc(), LeaveRequest.created_at.desc())
    )
    if month:
        month_start, month_end = _month_bounds(month)
        query = query.where(
            LeaveRequest.start_date >= month_start,
            LeaveRequest.start_date < month_end,
        )
    leaves = db.scalars(query).all()
    rows: list[dict[str, Any]] = []
    for leave in leaves:
        agent = agent_map.get(leave.requester_id)
        if not agent:
            continue
        rows.append(
            _serialize_leave(
                leave,
                requester_name=agent.name,
                requester_email=agent.email,
                requester_account_id=format_account_ref(role=REQUESTER_AGENT, member_id=agent.id),
                manager_name=manager_names.get(agent.manager_id),
                db=db,
            )
        )
    return rows


def _get_agent_leave_for_manager(db: Session, manager_id: int, leave_id: int) -> LeaveRequest | None:
    leave = db.get(LeaveRequest, leave_id)
    if not leave or leave.requester_type != REQUESTER_AGENT:
        return None
    if leave.assigned_reviewer_id is not None:
        if leave.assigned_reviewer_type != REVIEWER_MANAGER or leave.assigned_reviewer_id != manager_id:
            return None
        return leave
    agent = db.scalar(
        select(Agent).where(Agent.id == leave.requester_id, Agent.manager_id == manager_id)
    )
    if not agent:
        return None
    return leave


def _get_manager_leave_for_admin(db: Session, admin_id: int, leave_id: int) -> LeaveRequest | None:
    leave = db.get(LeaveRequest, leave_id)
    if not leave or leave.requester_type != REQUESTER_MANAGER:
        return None
    if leave.assigned_reviewer_id is not None:
        if leave.assigned_reviewer_type != REVIEWER_ADMIN or leave.assigned_reviewer_id != admin_id:
            return None
        return leave
    manager = db.scalar(
        select(Manager).where(
            Manager.id == leave.requester_id,
            Manager.id.in_(admin_manager_ids_subquery(admin_id)),
        )
    )
    if not manager:
        return None
    return leave


def review_agent_leave(
    db: Session,
    *,
    manager_id: int,
    leave_id: int,
    approve: bool,
    review_note: str | None = None,
) -> dict[str, Any]:
    leave = _get_agent_leave_for_manager(db, manager_id, leave_id)
    if not leave:
        raise LookupError("Leave request not found.")
    if leave.status != STATUS_PENDING:
        raise ValueError("This leave request has already been reviewed.")

    leave.status = STATUS_APPROVED if approve else STATUS_DECLINED
    leave.reviewed_by_type = REVIEWER_MANAGER
    leave.reviewed_by_id = manager_id
    leave.review_note = (review_note or "").strip() or None
    leave.reviewed_at = _utcnow()
    leave.updated_at = _utcnow()
    db.commit()
    db.refresh(leave)

    agent = db.get(Agent, leave.requester_id)
    manager = db.get(Manager, manager_id)
    _notify_leave_reviewed(
        db,
        leave=leave,
        requester_email=agent.email if agent else None,
        requester_name=agent.name if agent else None,
        requester_role=REQUESTER_AGENT,
        approved=approve,
        reviewer_name=manager.name if manager else "Manager",
    )
    return _serialize_leave(
        leave,
        requester_name=agent.name if agent else None,
        requester_email=agent.email if agent else None,
        requester_account_id=format_account_ref(role=REQUESTER_AGENT, member_id=leave.requester_id),
        db=db,
    )


def review_manager_leave(
    db: Session,
    *,
    admin_id: int,
    leave_id: int,
    approve: bool,
    review_note: str | None = None,
) -> dict[str, Any]:
    leave = _get_manager_leave_for_admin(db, admin_id, leave_id)
    if not leave:
        raise LookupError("Leave request not found.")
    if leave.status != STATUS_PENDING:
        raise ValueError("This leave request has already been reviewed.")

    leave.status = STATUS_APPROVED if approve else STATUS_DECLINED
    leave.reviewed_by_type = REVIEWER_ADMIN
    leave.reviewed_by_id = admin_id
    leave.review_note = (review_note or "").strip() or None
    leave.reviewed_at = _utcnow()
    leave.updated_at = _utcnow()
    db.commit()
    db.refresh(leave)

    manager = db.get(Manager, leave.requester_id)
    admin = db.get(Admin, admin_id)
    _notify_leave_reviewed(
        db,
        leave=leave,
        requester_email=manager.email if manager else None,
        requester_name=manager.name if manager else None,
        requester_role=REQUESTER_MANAGER,
        approved=approve,
        reviewer_name=admin.name if admin else "Admin",
    )
    return _serialize_leave(
        leave,
        requester_name=manager.name if manager else None,
        requester_email=manager.email if manager else None,
        requester_account_id=format_account_ref(role=REQUESTER_MANAGER, member_id=leave.requester_id),
        db=db,
    )


def is_on_approved_leave(db: Session, *, user_type: str, user_id: int, target: date) -> bool:
    leave = db.scalar(
        select(LeaveRequest.id)
        .where(
            LeaveRequest.requester_type == user_type,
            LeaveRequest.requester_id == user_id,
            LeaveRequest.status == STATUS_APPROVED,
            LeaveRequest.start_date <= target,
            LeaveRequest.end_date >= target,
        )
        .limit(1)
    )
    return leave is not None
