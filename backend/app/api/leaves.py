from datetime import date

from flask import Blueprint, jsonify, request
from pydantic import BaseModel, Field, ValidationError

from app.api.deps import _access_token, get_current_admin, get_current_agent, get_current_manager, get_db
from app.core.constants import ROLE_ADMIN, ROLE_AGENT, ROLE_MANAGER
from app.core.jwt import decode_access_token
from app.extensions.lifespan import ensure_db_ready
from app.models.leave import DURATION_FULL, DURATION_TYPES, LEAVE_TYPES, REQUESTER_AGENT, REQUESTER_MANAGER
from app.services.leaves import (
    calculate_leave_days,
    create_leave,
    delete_leave,
    get_agent_leave_routing,
    get_manager_leave_routing,
    list_agent_leaves,
    list_agent_leaves_for_manager,
    list_all_agent_leaves_for_admin,
    list_manager_leaves,
    list_manager_leaves_for_admin,
    list_pending_agent_leaves_for_manager,
    list_pending_manager_leaves_for_admin,
    build_leave_history_response,
    review_agent_leave,
    review_manager_leave,
    update_leave,
    validate_leave_dates,
)

leaves_bp = Blueprint("leaves", __name__, url_prefix="/api")


class LeavePayload(BaseModel):
    start_date: date
    end_date: date
    leave_type: str = Field(default="casual")
    duration_type: str = Field(default=DURATION_FULL)
    reason: str = Field(min_length=3, max_length=2000)


class ReviewPayload(BaseModel):
    review_note: str | None = Field(default=None, max_length=500)


def _db_unavailable_response():
    _, error = ensure_db_ready()
    return jsonify({"detail": error or "Database not connected"}), 503


def _parse_payload() -> tuple[LeavePayload | None, tuple | None]:
    try:
        return LeavePayload.model_validate(request.get_json(silent=True) or {}), None
    except ValidationError as exc:
        return None, (jsonify({"detail": exc.errors()}), 422)


def _require_authenticated_leave_actor() -> tuple | None:
    token = _access_token() or ""
    for role in (ROLE_ADMIN, ROLE_MANAGER, ROLE_AGENT):
        if decode_access_token(token, expected_role=role):
            return None
    return jsonify({"detail": "Not authenticated"}), 401


@leaves_bp.get("/leaves/preview")
def preview_leave_days():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    auth_error = _require_authenticated_leave_actor()
    if auth_error is not None:
        return auth_error

    start_raw = (request.args.get("start_date") or "").strip()
    end_raw = (request.args.get("end_date") or "").strip()
    duration_type = (request.args.get("duration_type") or DURATION_FULL).strip()
    if not start_raw or not end_raw:
        return jsonify({"detail": "start_date and end_date are required."}), 422
    if duration_type not in DURATION_TYPES:
        return jsonify({"detail": "Invalid duration_type."}), 422
    try:
        start = date.fromisoformat(start_raw)
        end = date.fromisoformat(end_raw)
    except ValueError:
        return jsonify({"detail": "Invalid date format."}), 422

    date_error = validate_leave_dates(start, end, duration_type)
    if date_error:
        return jsonify({"detail": date_error}), 422

    try:
        breakdown = calculate_leave_days(start, end, duration_type)
    except ValueError as exc:
        return jsonify({"detail": str(exc)}), 422
    return jsonify(breakdown)


@leaves_bp.get("/agent/leaves/routing")
def get_agent_leave_routing_route():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    agent = get_current_agent()
    if not agent:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        try:
            return jsonify(get_agent_leave_routing(db, agent.id))
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.get("/agent/leaves")
def get_agent_leaves():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    agent = get_current_agent()
    if not agent:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        return jsonify({"items": list_agent_leaves(db, agent.id)})


@leaves_bp.post("/agent/leaves")
def post_agent_leave():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    agent = get_current_agent()
    if not agent:
        return jsonify({"detail": "Not authenticated"}), 401

    payload, error = _parse_payload()
    if error:
        return error

    with get_db() as db:
        try:
            item = create_leave(
                db,
                requester_type=REQUESTER_AGENT,
                requester_id=agent.id,
                start_date=payload.start_date,
                end_date=payload.end_date,
                leave_type=payload.leave_type,
                duration_type=payload.duration_type,
                reason=payload.reason,
            )
            return jsonify(item), 201
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.patch("/agent/leaves/<int:leave_id>")
def patch_agent_leave(leave_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    agent = get_current_agent()
    if not agent:
        return jsonify({"detail": "Not authenticated"}), 401

    payload, error = _parse_payload()
    if error:
        return error

    with get_db() as db:
        try:
            item = update_leave(
                db,
                leave_id=leave_id,
                requester_type=REQUESTER_AGENT,
                requester_id=agent.id,
                start_date=payload.start_date,
                end_date=payload.end_date,
                leave_type=payload.leave_type,
                duration_type=payload.duration_type,
                reason=payload.reason,
            )
            return jsonify(item)
        except LookupError:
            return jsonify({"detail": "Leave request not found."}), 404
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.delete("/agent/leaves/<int:leave_id>")
def delete_agent_leave(leave_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    agent = get_current_agent()
    if not agent:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        try:
            delete_leave(db, leave_id=leave_id, requester_type=REQUESTER_AGENT, requester_id=agent.id)
            return jsonify({"message": "Leave request deleted."})
        except LookupError:
            return jsonify({"detail": "Leave request not found."}), 404
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.get("/manager/leaves/routing")
def get_manager_leave_routing_route():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        try:
            return jsonify(get_manager_leave_routing(db, manager.id))
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.get("/manager/leaves")
def get_manager_leaves():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        return jsonify({"items": list_manager_leaves(db, manager.id)})


@leaves_bp.post("/manager/leaves")
def post_manager_leave():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    payload, error = _parse_payload()
    if error:
        return error

    with get_db() as db:
        try:
            item = create_leave(
                db,
                requester_type=REQUESTER_MANAGER,
                requester_id=manager.id,
                start_date=payload.start_date,
                end_date=payload.end_date,
                leave_type=payload.leave_type,
                duration_type=payload.duration_type,
                reason=payload.reason,
            )
            return jsonify(item), 201
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.patch("/manager/leaves/<int:leave_id>")
def patch_manager_leave(leave_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    payload, error = _parse_payload()
    if error:
        return error

    with get_db() as db:
        try:
            item = update_leave(
                db,
                leave_id=leave_id,
                requester_type=REQUESTER_MANAGER,
                requester_id=manager.id,
                start_date=payload.start_date,
                end_date=payload.end_date,
                leave_type=payload.leave_type,
                duration_type=payload.duration_type,
                reason=payload.reason,
            )
            return jsonify(item)
        except LookupError:
            return jsonify({"detail": "Leave request not found."}), 404
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.delete("/manager/leaves/<int:leave_id>")
def delete_manager_leave(leave_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        try:
            delete_leave(db, leave_id=leave_id, requester_type=REQUESTER_MANAGER, requester_id=manager.id)
            return jsonify({"message": "Leave request deleted."})
        except LookupError:
            return jsonify({"detail": "Leave request not found."}), 404
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


def _parse_month_param() -> str | None:
    raw = (request.args.get("month") or "").strip()
    if not raw:
        return None
    try:
        year, mon = map(int, raw.split("-", 1))
        if mon < 1 or mon > 12:
            raise ValueError
        return f"{year:04d}-{mon:02d}"
    except ValueError:
        return None


@leaves_bp.get("/manager/leaves/agents")
def get_manager_agent_leaves():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    month = _parse_month_param()
    with get_db() as db:
        items = list_agent_leaves_for_manager(db, manager.id, month=month)
        return jsonify(build_leave_history_response(month=month, items=items))


@leaves_bp.get("/manager/leaves/pending")
def get_manager_pending_leaves():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        return jsonify({"items": list_pending_agent_leaves_for_manager(db, manager.id)})


@leaves_bp.post("/manager/leaves/<int:leave_id>/approve")
def approve_agent_leave(leave_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        payload = ReviewPayload.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        try:
            item = review_agent_leave(
                db,
                manager_id=manager.id,
                leave_id=leave_id,
                approve=True,
                review_note=payload.review_note,
            )
            return jsonify(item)
        except LookupError:
            return jsonify({"detail": "Leave request not found."}), 404
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.post("/manager/leaves/<int:leave_id>/decline")
def decline_agent_leave(leave_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        payload = ReviewPayload.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        try:
            item = review_agent_leave(
                db,
                manager_id=manager.id,
                leave_id=leave_id,
                approve=False,
                review_note=payload.review_note,
            )
            return jsonify(item)
        except LookupError:
            return jsonify({"detail": "Leave request not found."}), 404
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.get("/admin/leaves/pending")
def get_admin_pending_leaves():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin = get_current_admin()
    if not admin:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        return jsonify({"items": list_pending_manager_leaves_for_admin(db, admin.id)})


@leaves_bp.get("/admin/leaves/managers")
def get_admin_manager_leaves():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin = get_current_admin()
    if not admin:
        return jsonify({"detail": "Not authenticated"}), 401

    month = _parse_month_param()
    with get_db() as db:
        items = list_manager_leaves_for_admin(db, admin.id, month=month)
        return jsonify(build_leave_history_response(month=month, items=items))


@leaves_bp.get("/admin/leaves/agents")
def get_admin_agent_leaves():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin = get_current_admin()
    if not admin:
        return jsonify({"detail": "Not authenticated"}), 401

    month = _parse_month_param()
    with get_db() as db:
        items = list_all_agent_leaves_for_admin(db, admin.id, month=month)
        return jsonify(build_leave_history_response(month=month, items=items))


@leaves_bp.post("/admin/leaves/<int:leave_id>/approve")
def approve_manager_leave(leave_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin = get_current_admin()
    if not admin:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        payload = ReviewPayload.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        try:
            item = review_manager_leave(
                db,
                admin_id=admin.id,
                leave_id=leave_id,
                approve=True,
                review_note=payload.review_note,
            )
            return jsonify(item)
        except LookupError:
            return jsonify({"detail": "Leave request not found."}), 404
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.post("/admin/leaves/<int:leave_id>/decline")
def decline_manager_leave(leave_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin = get_current_admin()
    if not admin:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        payload = ReviewPayload.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        try:
            item = review_manager_leave(
                db,
                admin_id=admin.id,
                leave_id=leave_id,
                approve=False,
                review_note=payload.review_note,
            )
            return jsonify(item)
        except LookupError:
            return jsonify({"detail": "Leave request not found."}), 404
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 422


@leaves_bp.get("/leaves/types")
def get_leave_types():
    return jsonify({"items": LEAVE_TYPES})
