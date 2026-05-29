from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.api.common import (
    auth_error_response,
    db_unavailable_response,
    invalid_account_response,
    list_pagination_params,
    parse_status_filter,
)
from app.api.deps import get_current_admin, get_db
from app.extensions.lifespan import ensure_db_ready
from app.models.agent import Agent
from app.schemas.team import (
    AgentCreateRequest,
    AgentUpdateRequest,
    ManagerCreateRequest,
    ManagerUpdateRequest,
    StatusUpdateRequest,
)
from app.services.email import (
    send_team_member_created_email,
    send_team_member_deleted_email,
    send_team_member_status_email,
)
from app.services.auth import get_admin_by_id
from app.services.organizations import get_active_organization_for_admin, is_organization_email_in_use
from app.utils.names import combine_person_name
from app.services.team import (
    _managers_with_team_counts,
    _serialize_agent,
    _serialize_manager,
    create_agent,
    create_manager,
    delete_agent,
    delete_manager,
    get_agent_for_admin,
    get_manager_for_admin,
    list_agents,
    list_managers,
    pagination_meta,
    resolve_agent_account_id,
    resolve_manager_account_id,
    update_agent,
    update_agent_status,
    update_manager,
    update_manager_status,
)

team_bp = Blueprint("team", __name__, url_prefix="/api")


@team_bp.get("/managers")
def get_managers():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    page, page_size, active_only = list_pagination_params(include_active_only=True)
    search = (request.args.get("search") or "").strip() or None
    is_active = parse_status_filter()
    organization_id = request.args.get("organization_id", default=None, type=int)
    with get_db() as db:
        items, total = list_managers(
            db,
            admin_id=admin.id,
            page=page,
            page_size=page_size,
            active_only=active_only,
            is_active=is_active,
            search=search,
            organization_id=organization_id,
        )
        return jsonify(
            {
                "items": items,
                "pagination": pagination_meta(page=page, page_size=page_size, total=total),
            }
        )


@team_bp.post("/managers")
def post_manager():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    try:
        payload = ManagerCreateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        if is_organization_email_in_use(db, payload.email):
            return jsonify({"detail": "Email is already in use"}), 409

        if not get_active_organization_for_admin(db, payload.organization_id, admin.id):
            return jsonify({"detail": "Selected organization was not found or is inactive"}), 404

        manager = create_manager(
            db,
            admin_id=admin.id,
            email=payload.email,
            password=payload.password,
            name=combine_person_name(payload.first_name, payload.last_name),
            organization_id=payload.organization_id,
            phone=payload.phone,
            job_title=payload.job_title,
        )
        if not manager:
            return auth_error_response()

        email_sent = send_team_member_created_email(
            role_label="Manager",
            to_email=manager.email,
            name=manager.name,
            member_id=manager.id,
            password=payload.password,
            created_by_name=admin.name,
        )

        return jsonify(
            {
                "item": _serialize_manager(manager),
                "message": "Manager created",
                "email_sent": email_sent,
            }
        ), 201


@team_bp.get("/managers/<account_id>")
def get_manager(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    manager_id = resolve_manager_account_id(account_id)
    if not manager_id:
        return invalid_account_response()

    with get_db() as db:
        manager = get_manager_for_admin(db, manager_id, admin.id)
        if not manager:
            return jsonify({"detail": "Manager not found"}), 404
        item = _managers_with_team_counts(db, [manager])[0]
        return jsonify({"item": item})


@team_bp.patch("/managers/<account_id>")
def patch_manager(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    manager_id = resolve_manager_account_id(account_id)
    if not manager_id:
        return invalid_account_response()

    try:
        payload = ManagerUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        if not get_manager_for_admin(db, manager_id, admin.id):
            return jsonify({"detail": "Manager not found"}), 404

        manager = update_manager(
            db,
            manager_id,
            admin.id,
            name=combine_person_name(payload.first_name, payload.last_name),
            phone=payload.phone,
            job_title=payload.job_title,
        )
        if not manager:
            return jsonify({"detail": "Manager not found"}), 404

        return jsonify({"item": _serialize_manager(manager), "message": "Manager updated"})


@team_bp.patch("/managers/<account_id>/status")
def patch_manager_status(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    manager_id = resolve_manager_account_id(account_id)
    if not manager_id:
        return invalid_account_response()

    try:
        payload = StatusUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        if not get_manager_for_admin(db, manager_id, admin.id):
            return jsonify({"detail": "Manager not found"}), 404

        manager = update_manager_status(db, manager_id, admin.id, is_active=payload.is_active)
        if not manager:
            return jsonify({"detail": "Manager not found"}), 404

        email_sent = send_team_member_status_email(
            role_label="Manager",
            to_email=manager.email,
            name=manager.name,
            member_id=manager.id,
            is_active=payload.is_active,
            updated_by_name=admin.name,
        )

        return jsonify(
            {
                "item": _serialize_manager(manager),
                "message": "Manager status updated",
                "email_sent": email_sent,
            }
        )


@team_bp.delete("/managers/<account_id>")
def remove_manager(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    manager_id = resolve_manager_account_id(account_id)
    if not manager_id:
        return invalid_account_response()

    with get_db() as db:
        manager = get_manager_for_admin(db, manager_id, admin.id)
        if not manager:
            return jsonify({"detail": "Manager not found"}), 404

        assigned_agents = (
            db.query(Agent)
            .filter(Agent.manager_id == manager_id)
            .count()
        )
        if assigned_agents > 0:
            return jsonify(
                {
                    "detail": (
                        f"Cannot delete this manager — {assigned_agents} agent(s) are still assigned. "
                        "Reassign or delete those agents first."
                    )
                }
            ), 409

        snapshot = {
            "email": manager.email,
            "name": manager.name,
            "member_id": manager.id,
        }
        delete_manager(db, manager_id, admin.id)

        email_sent = send_team_member_deleted_email(
            role_label="Manager",
            to_email=snapshot["email"],
            name=snapshot["name"],
            member_id=snapshot["member_id"],
            deleted_by_name=admin.name,
        )

        return jsonify({"message": "Manager deleted", "email_sent": email_sent})


@team_bp.get("/agents")
def get_agents():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    page, page_size, _ = list_pagination_params(include_active_only=True)
    search = (request.args.get("search") or "").strip() or None
    is_active = parse_status_filter()
    manager_account_id = (request.args.get("manager_account_id") or "").strip() or None
    with get_db() as db:
        manager_id = None
        if manager_account_id:
            manager_id = resolve_manager_account_id(manager_account_id)
            if manager_id is None:
                return invalid_account_response()
            if not get_manager_for_admin(db, manager_id, admin.id):
                return jsonify({"detail": "Selected manager was not found."}), 422

        items, total = list_agents(
            db,
            admin_id=admin.id,
            page=page,
            page_size=page_size,
            manager_id=manager_id,
            is_active=is_active,
            search=search,
        )
        return jsonify(
            {
                "items": items,
                "pagination": pagination_meta(page=page, page_size=page_size, total=total),
            }
        )


@team_bp.post("/agents")
def post_agent():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    try:
        payload = AgentCreateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        if is_organization_email_in_use(db, payload.email):
            return jsonify({"detail": "Email is already in use"}), 409

        manager_id = resolve_manager_account_id(payload.manager_account_id)
        if not manager_id:
            return invalid_account_response()

        if not get_manager_for_admin(db, manager_id, admin.id):
            return jsonify({"detail": "Selected manager was not found or is inactive"}), 404

        agent = create_agent(
            db,
            admin_id=admin.id,
            email=payload.email,
            password=payload.password,
            name=combine_person_name(payload.first_name, payload.last_name),
            phone=payload.phone,
            job_title=payload.job_title,
            manager_id=manager_id,
        )
        if not agent:
            return jsonify({"detail": "Selected manager was not found or is inactive"}), 404

        manager_name = agent.manager.name if agent.manager else None

        email_sent = send_team_member_created_email(
            role_label="Agent",
            to_email=agent.email,
            name=agent.name,
            member_id=agent.id,
            password=payload.password,
            created_by_name=manager_name or admin.name,
        )

        return jsonify(
            {
                "item": _serialize_agent(agent),
                "message": "Agent created",
                "email_sent": email_sent,
            }
        ), 201


@team_bp.get("/agents/<account_id>")
def get_agent(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    with get_db() as db:
        agent = get_agent_for_admin(db, agent_id, admin.id)
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404
        return jsonify({"item": _serialize_agent(agent)})


@team_bp.patch("/agents/<account_id>")
def patch_agent(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    try:
        payload = AgentUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        if not get_agent_for_admin(db, agent_id, admin.id):
            return jsonify({"detail": "Agent not found"}), 404

        manager_id = resolve_manager_account_id(payload.manager_account_id)
        if not manager_id:
            return invalid_account_response()

        if not get_manager_for_admin(db, manager_id, admin.id):
            return jsonify({"detail": "Selected manager was not found or is inactive"}), 404

        agent = update_agent(
            db,
            agent_id,
            admin.id,
            name=combine_person_name(payload.first_name, payload.last_name),
            phone=payload.phone,
            job_title=payload.job_title,
            manager_id=manager_id,
        )
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404

        return jsonify({"item": _serialize_agent(agent), "message": "Agent updated"})


@team_bp.patch("/agents/<account_id>/status")
def patch_agent_status(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    try:
        payload = StatusUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        if not get_agent_for_admin(db, agent_id, admin.id):
            return jsonify({"detail": "Agent not found"}), 404

        agent = update_agent_status(db, agent_id, admin.id, is_active=payload.is_active)
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404

        email_sent = send_team_member_status_email(
            role_label="Agent",
            to_email=agent.email,
            name=agent.name,
            member_id=agent.id,
            is_active=payload.is_active,
            updated_by_name=admin.name,
        )

        return jsonify(
            {
                "item": _serialize_agent(agent),
                "message": "Agent status updated",
                "email_sent": email_sent,
            }
        )


@team_bp.delete("/agents/<account_id>")
def remove_agent(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    with get_db() as db:
        agent = get_agent_for_admin(db, agent_id, admin.id)
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404

        snapshot = {
            "email": agent.email,
            "name": agent.name,
            "member_id": agent.id,
        }
        delete_agent(db, agent_id, admin.id)

        email_sent = send_team_member_deleted_email(
            role_label="Agent",
            to_email=snapshot["email"],
            name=snapshot["name"],
            member_id=snapshot["member_id"],
            deleted_by_name=admin.name,
        )

        return jsonify({"message": "Agent deleted", "email_sent": email_sent})
