from datetime import date

from flask import Blueprint, jsonify, request
from pydantic import BaseModel, Field, ValidationError

from app.api.deps import _access_token, get_current_admin, get_current_agent, get_current_manager, get_db
from app.core.constants import ROLE_AGENT, ROLE_MANAGER
from app.core.jwt import decode_access_token
from app.extensions.lifespan import ensure_db_ready, run_pending_migrations
from app.models.attendance import (
    EVENT_ACTIVE,
    EVENT_HEARTBEAT,
    EVENT_IDLE_END,
    EVENT_IDLE_START,
    USER_TYPE_AGENT,
    USER_TYPE_MANAGER,
)
from app.services.attendance import (
    get_agent_for_admin_attendance,
    get_agent_for_manager_attendance,
    get_manager_for_admin_attendance,
    get_user_attendance_detail,
    list_agent_attendance_for_admin,
    list_agent_attendance_for_manager,
    list_manager_attendance_for_admin,
    record_logout,
    record_presence,
)
from app.utils.account_ref import format_account_ref, parse_account_ref

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api")

PRESENCE_EVENTS = {EVENT_HEARTBEAT, EVENT_IDLE_START, EVENT_IDLE_END, EVENT_ACTIVE}


@attendance_bp.before_request
def _attendance_migrations():
    ready, _ = ensure_db_ready()
    if ready:
        run_pending_migrations()


class PresenceRequest(BaseModel):
    event: str = Field(default=EVENT_HEARTBEAT)


def _db_unavailable_response():
    _, error = ensure_db_ready()
    return jsonify({"detail": error or "Database not connected"}), 503


def _parse_target_date() -> date:
    raw = (request.args.get("date") or "").strip()
    if raw:
        return date.fromisoformat(raw)
    return date.today()


def _resolve_presence_actor():
    token = _access_token() or ""
    agent_id = decode_access_token(token, expected_role=ROLE_AGENT)
    if agent_id:
        return USER_TYPE_AGENT, agent_id
    manager_id = decode_access_token(token, expected_role=ROLE_MANAGER)
    if manager_id:
        return USER_TYPE_MANAGER, manager_id
    return None, None


@attendance_bp.post("/attendance/logout")
def post_attendance_logout():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    user_type, user_id = _resolve_presence_actor()
    if not user_type or not user_id:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        ended = record_logout(db, user_type, user_id)
        return jsonify({"message": "Session ended", "ended": ended})


@attendance_bp.post("/attendance/presence")
def post_presence():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    user_type, user_id = _resolve_presence_actor()
    if not user_type or not user_id:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        payload = PresenceRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    if payload.event not in PRESENCE_EVENTS:
        return jsonify({"detail": "Invalid presence event"}), 422

    with get_db() as db:
        result = record_presence(db, user_type, user_id, payload.event)
        return jsonify(result)


@attendance_bp.get("/agent/attendance")
def get_agent_attendance():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    agent = get_current_agent()
    if not agent:
        return jsonify({"detail": "Not authenticated"}), 401

    target = _parse_target_date()
    with get_db() as db:
        detail = get_user_attendance_detail(
            db,
            user_type=USER_TYPE_AGENT,
            user_id=agent.id,
            target=target,
        )
        detail["account_id"] = format_account_ref(role=USER_TYPE_AGENT, member_id=agent.id)
        detail["name"] = agent.name
        detail["email"] = agent.email
        return jsonify(detail)


@attendance_bp.get("/manager/attendance")
def get_manager_team_attendance():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    target = _parse_target_date()
    with get_db() as db:
        items = list_agent_attendance_for_manager(db, manager.id, target)
        return jsonify({"date": target.isoformat(), "items": items})


@attendance_bp.get("/manager/attendance/agents/<account_id>")
def get_manager_agent_attendance(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        role, member_id = parse_account_ref(account_id)
    except ValueError:
        return jsonify({"detail": "Invalid account ID"}), 400
    if role != USER_TYPE_AGENT:
        return jsonify({"detail": "Invalid account ID"}), 400

    target = _parse_target_date()
    with get_db() as db:
        agent = get_agent_for_manager_attendance(db, manager.id, member_id)
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404
        detail = get_user_attendance_detail(
            db,
            user_type=USER_TYPE_AGENT,
            user_id=agent.id,
            target=target,
        )
        detail.update(
            {
                "account_id": account_id.upper(),
                "name": agent.name,
                "email": agent.email,
            }
        )
        return jsonify(detail)


@attendance_bp.get("/manager/attendance/me")
def get_manager_self_attendance():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    target = _parse_target_date()
    with get_db() as db:
        detail = get_user_attendance_detail(
            db,
            user_type=USER_TYPE_MANAGER,
            user_id=manager.id,
            target=target,
        )
        detail["account_id"] = format_account_ref(role=USER_TYPE_MANAGER, member_id=manager.id)
        detail["name"] = manager.name
        detail["email"] = manager.email
        return jsonify(detail)


@attendance_bp.get("/admin/attendance/managers")
def get_admin_manager_attendance():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin = get_current_admin()
    if not admin:
        return jsonify({"detail": "Not authenticated"}), 401

    target = _parse_target_date()
    with get_db() as db:
        items = list_manager_attendance_for_admin(db, admin.id, target)
        return jsonify({"date": target.isoformat(), "items": items})


@attendance_bp.get("/admin/attendance/agents")
def get_admin_agent_attendance():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin = get_current_admin()
    if not admin:
        return jsonify({"detail": "Not authenticated"}), 401

    target = _parse_target_date()
    with get_db() as db:
        items = list_agent_attendance_for_admin(db, admin.id, target)
        return jsonify({"date": target.isoformat(), "items": items})


@attendance_bp.get("/admin/attendance/managers/<account_id>")
def get_admin_manager_attendance_detail(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin = get_current_admin()
    if not admin:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        role, member_id = parse_account_ref(account_id)
    except ValueError:
        return jsonify({"detail": "Invalid account ID"}), 400
    if role != USER_TYPE_MANAGER:
        return jsonify({"detail": "Invalid account ID"}), 400

    target = _parse_target_date()
    with get_db() as db:
        manager = get_manager_for_admin_attendance(db, admin.id, member_id)
        if not manager:
            return jsonify({"detail": "Manager not found"}), 404
        detail = get_user_attendance_detail(
            db,
            user_type=USER_TYPE_MANAGER,
            user_id=manager.id,
            target=target,
        )
        detail.update(
            {
                "account_id": account_id.upper(),
                "name": manager.name,
                "email": manager.email,
            }
        )
        return jsonify(detail)


@attendance_bp.get("/admin/attendance/agents/<account_id>")
def get_admin_agent_attendance_detail(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin = get_current_admin()
    if not admin:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        role, member_id = parse_account_ref(account_id)
    except ValueError:
        return jsonify({"detail": "Invalid account ID"}), 400
    if role != USER_TYPE_AGENT:
        return jsonify({"detail": "Invalid account ID"}), 400

    target = _parse_target_date()
    with get_db() as db:
        agent = get_agent_for_admin_attendance(db, admin.id, member_id)
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404
        detail = get_user_attendance_detail(
            db,
            user_type=USER_TYPE_AGENT,
            user_id=agent.id,
            target=target,
        )
        detail.update(
            {
                "account_id": account_id.upper(),
                "name": agent.name,
                "email": agent.email,
            }
        )
        return jsonify(detail)
