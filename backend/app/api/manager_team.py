from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.api.common import (
    auth_error_response,
    db_unavailable_response,
    email_is_taken,
    invalid_account_response,
    list_pagination_params,
    parse_status_filter,
)
from app.api.deps import get_current_manager, get_db
from app.extensions.lifespan import ensure_db_ready
from app.schemas.team import ManagerAgentCreateRequest, ManagerAgentUpdateRequest, StatusUpdateRequest
from app.services.email import (
    send_team_member_created_email,
    send_team_member_deleted_email,
    send_team_member_status_email,
)
from app.utils.names import combine_person_name
from app.services.team import (
    _serialize_manager_scoped_agent,
    create_agent_for_manager,
    delete_agent_for_manager,
    get_agent_for_manager,
    get_manager_by_id,
    list_agents_for_manager,
    pagination_meta,
    resolve_agent_account_id,
    update_agent_for_manager,
    update_agent_status_for_manager,
)

manager_team_bp = Blueprint("manager_team", __name__, url_prefix="/api/manager")


@manager_team_bp.get("/agents")
def get_manager_agents():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return auth_error_response()

    page, page_size = list_pagination_params()
    search = (request.args.get("search") or "").strip() or None
    is_active = parse_status_filter()
    with get_db() as db:
        items, total = list_agents_for_manager(
            db,
            manager.id,
            page=page,
            page_size=page_size,
            is_active=is_active,
            search=search,
        )
        return jsonify(
            {
                "items": items,
                "pagination": pagination_meta(page=page, page_size=page_size, total=total),
            }
        )


@manager_team_bp.post("/agents")
def post_manager_agent():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return auth_error_response()

    try:
        payload = ManagerAgentCreateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        current = get_manager_by_id(db, manager.id)
        if not current:
            return auth_error_response()

        if email_is_taken(db, payload.email):
            return jsonify({"detail": "Email is already in use"}), 409

        agent = create_agent_for_manager(
            db,
            current,
            email=payload.email,
            password=payload.password,
            name=combine_person_name(payload.first_name, payload.last_name),
            phone=payload.phone,
            job_title=payload.job_title,
        )
        if not agent:
            return jsonify({"detail": "Unable to create agent"}), 400

        email_sent = send_team_member_created_email(
            role_label="Agent",
            to_email=agent.email,
            name=agent.name,
            member_id=agent.id,
            password=payload.password,
            created_by_name=current.name,
        )

        return jsonify(
            {
                "item": _serialize_manager_scoped_agent(agent),
                "message": "Agent created",
                "email_sent": email_sent,
            }
        ), 201


@manager_team_bp.get("/agents/<account_id>")
def get_manager_agent(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    with get_db() as db:
        agent = get_agent_for_manager(db, agent_id, manager.id)
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404
        return jsonify({"item": _serialize_manager_scoped_agent(agent)})


@manager_team_bp.patch("/agents/<account_id>")
def patch_manager_agent(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    try:
        payload = ManagerAgentUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        agent = update_agent_for_manager(
            db,
            agent_id,
            manager.id,
            name=combine_person_name(payload.first_name, payload.last_name),
            phone=payload.phone,
            job_title=payload.job_title,
        )
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404

        return jsonify({"item": _serialize_manager_scoped_agent(agent), "message": "Agent updated"})


@manager_team_bp.patch("/agents/<account_id>/status")
def patch_manager_agent_status(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    try:
        payload = StatusUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        current = get_manager_by_id(db, manager.id)
        if not current:
            return auth_error_response()

        agent = update_agent_status_for_manager(
            db, agent_id, manager.id, is_active=payload.is_active
        )
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404

        email_sent = send_team_member_status_email(
            role_label="Agent",
            to_email=agent.email,
            name=agent.name,
            member_id=agent.id,
            is_active=payload.is_active,
            updated_by_name=current.name,
        )

        return jsonify(
            {
                "item": _serialize_manager_scoped_agent(agent),
                "message": "Agent status updated",
                "email_sent": email_sent,
            }
        )


@manager_team_bp.delete("/agents/<account_id>")
def remove_manager_agent(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    with get_db() as db:
        current = get_manager_by_id(db, manager.id)
        if not current:
            return auth_error_response()

        agent = get_agent_for_manager(db, agent_id, manager.id)
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404

        snapshot = {
            "email": agent.email,
            "name": agent.name,
            "member_id": agent.id,
        }
        delete_agent_for_manager(db, agent_id, manager.id)

        email_sent = send_team_member_deleted_email(
            role_label="Agent",
            to_email=snapshot["email"],
            name=snapshot["name"],
            member_id=snapshot["member_id"],
            deleted_by_name=current.name,
        )

        return jsonify({"message": "Agent deleted", "email_sent": email_sent})
