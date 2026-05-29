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
from app.api.deps import get_current_organization, get_db
from app.extensions.lifespan import ensure_db_ready
from app.models.agent import Agent
from app.schemas.team import (
    AgentCreateRequest,
    AgentUpdateRequest,
    ManagerAgentCreateRequest,
    ManagerUpdateRequest,
    StatusUpdateRequest,
)
from app.services.dashboard_stats import get_organization_dashboard_stats_cached
from app.services.email import (
    send_team_member_created_email,
    send_team_member_deleted_email,
    send_team_member_status_email,
)
from app.utils.names import combine_person_name
from app.utils.pagination import pagination_meta
from app.services.team import (
    _serialize_agent,
    _serialize_manager,
    create_agent_for_organization,
    create_manager_for_organization,
    delete_agent_for_organization,
    delete_manager_for_organization,
    get_agent_for_organization,
    get_manager_for_organization,
    list_agents_for_organization,
    list_managers_for_organization,
    resolve_agent_account_id,
    resolve_manager_account_id,
    update_agent_for_organization,
    update_agent_status_for_organization,
    update_manager_for_organization,
    update_manager_status_for_organization,
)

organization_team_bp = Blueprint("organization_team", __name__, url_prefix="/api/organization")


@organization_team_bp.get("/dashboard/stats")
def organization_dashboard_stats():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    with get_db() as db:
        payload = get_organization_dashboard_stats_cached(db, organization.id)
        response = jsonify(payload)
        response.headers["Cache-Control"] = "private, max-age=15"
        return response


@organization_team_bp.get("/managers")
def get_organization_managers():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    page, page_size = list_pagination_params()
    search = (request.args.get("search") or "").strip() or None
    is_active = parse_status_filter()

    with get_db() as db:
        items, total = list_managers_for_organization(
            db,
            organization_id=organization.id,
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


@organization_team_bp.post("/managers")
def post_organization_manager():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    try:
        payload = ManagerAgentCreateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        if email_is_taken(db, payload.email):
            return jsonify({"detail": "Email is already in use"}), 409

        manager = create_manager_for_organization(
            db,
            organization,
            email=payload.email,
            password=payload.password,
            name=combine_person_name(payload.first_name, payload.last_name),
            phone=payload.phone,
            job_title=payload.job_title,
        )
        if not manager:
            return jsonify({"detail": "Unable to create manager"}), 400

        email_sent = send_team_member_created_email(
            role_label="Manager",
            to_email=manager.email,
            name=manager.name,
            member_id=manager.id,
            password=payload.password,
            created_by_name=organization.name,
        )

        return jsonify(
            {
                "item": _serialize_manager(manager),
                "message": "Manager created",
                "email_sent": email_sent,
            }
        ), 201


@organization_team_bp.get("/managers/<account_id>")
def get_organization_manager(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    manager_id = resolve_manager_account_id(account_id)
    if not manager_id:
        return invalid_account_response()

    with get_db() as db:
        manager = get_manager_for_organization(db, manager_id, organization.id)
        if not manager:
            return jsonify({"detail": "Manager not found"}), 404
        return jsonify({"item": _serialize_manager(manager)})


@organization_team_bp.patch("/managers/<account_id>")
def patch_organization_manager(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    manager_id = resolve_manager_account_id(account_id)
    if not manager_id:
        return invalid_account_response()

    try:
        payload = ManagerUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        manager = update_manager_for_organization(
            db,
            manager_id,
            organization.id,
            name=combine_person_name(payload.first_name, payload.last_name),
            phone=payload.phone,
            job_title=payload.job_title,
        )
        if not manager:
            return jsonify({"detail": "Manager not found"}), 404

        return jsonify({"item": _serialize_manager(manager), "message": "Manager updated"})


@organization_team_bp.patch("/managers/<account_id>/status")
def patch_organization_manager_status(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    manager_id = resolve_manager_account_id(account_id)
    if not manager_id:
        return invalid_account_response()

    try:
        payload = StatusUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        manager = update_manager_status_for_organization(
            db, manager_id, organization.id, is_active=payload.is_active
        )
        if not manager:
            return jsonify({"detail": "Manager not found"}), 404

        email_sent = send_team_member_status_email(
            role_label="Manager",
            to_email=manager.email,
            name=manager.name,
            member_id=manager.id,
            is_active=payload.is_active,
            updated_by_name=organization.name,
        )

        return jsonify(
            {
                "item": _serialize_manager(manager),
                "message": "Manager status updated",
                "email_sent": email_sent,
            }
        )


@organization_team_bp.delete("/managers/<account_id>")
def remove_organization_manager(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    manager_id = resolve_manager_account_id(account_id)
    if not manager_id:
        return invalid_account_response()

    with get_db() as db:
        manager = get_manager_for_organization(db, manager_id, organization.id)
        if not manager:
            return jsonify({"detail": "Manager not found"}), 404

        assigned_agents = db.query(Agent).filter(Agent.manager_id == manager_id).count()
        if assigned_agents > 0:
            return jsonify(
                {
                    "detail": (
                        f"Cannot delete this manager — {assigned_agents} agent(s) are still assigned. "
                        "Reassign or delete those agents first."
                    )
                }
            ), 409

        snapshot = {"email": manager.email, "name": manager.name, "member_id": manager.id}
        delete_manager_for_organization(db, manager_id, organization.id)

        email_sent = send_team_member_deleted_email(
            role_label="Manager",
            to_email=snapshot["email"],
            name=snapshot["name"],
            member_id=snapshot["member_id"],
            deleted_by_name=organization.name,
        )

        return jsonify({"message": "Manager deleted", "email_sent": email_sent})


@organization_team_bp.get("/agents")
def get_organization_agents():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    page, page_size = list_pagination_params()
    search = (request.args.get("search") or "").strip() or None
    manager_account_id = (request.args.get("manager_account_id") or "").strip() or None
    is_active = parse_status_filter()

    manager_id = None
    if manager_account_id:
        manager_id = resolve_manager_account_id(manager_account_id)
        if not manager_id:
            return jsonify({"detail": "Invalid manager account ID"}), 400

    with get_db() as db:
        if manager_id is not None:
            scoped_manager = get_manager_for_organization(db, manager_id, organization.id)
            if not scoped_manager:
                return jsonify({"detail": "Selected manager was not found"}), 404

        items, total = list_agents_for_organization(
            db,
            organization_id=organization.id,
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


@organization_team_bp.post("/agents")
def post_organization_agent():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    try:
        payload = AgentCreateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        if email_is_taken(db, payload.email):
            return jsonify({"detail": "Email is already in use"}), 409

        manager_id = resolve_manager_account_id(payload.manager_account_id)
        if not manager_id:
            return invalid_account_response()

        if not get_manager_for_organization(db, manager_id, organization.id):
            return jsonify({"detail": "Selected manager was not found or is inactive"}), 404

        agent = create_agent_for_organization(
            db,
            organization,
            manager_id=manager_id,
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
            created_by_name=organization.name,
        )

        return jsonify(
            {
                "item": _serialize_agent(agent),
                "message": "Agent created",
                "email_sent": email_sent,
            }
        ), 201


@organization_team_bp.get("/agents/<account_id>")
def get_organization_agent(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    with get_db() as db:
        agent = get_agent_for_organization(db, agent_id, organization.id)
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404
        return jsonify({"item": _serialize_agent(agent)})


@organization_team_bp.patch("/agents/<account_id>")
def patch_organization_agent(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    try:
        payload = AgentUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        manager_id = resolve_manager_account_id(payload.manager_account_id)
        if not manager_id:
            return invalid_account_response()

        agent = update_agent_for_organization(
            db,
            agent_id,
            organization.id,
            name=combine_person_name(payload.first_name, payload.last_name),
            phone=payload.phone,
            job_title=payload.job_title,
            manager_id=manager_id,
        )
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404

        return jsonify({"item": _serialize_agent(agent), "message": "Agent updated"})


@organization_team_bp.patch("/agents/<account_id>/status")
def patch_organization_agent_status(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    try:
        payload = StatusUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        agent = update_agent_status_for_organization(
            db, agent_id, organization.id, is_active=payload.is_active
        )
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404

        email_sent = send_team_member_status_email(
            role_label="Agent",
            to_email=agent.email,
            name=agent.name,
            member_id=agent.id,
            is_active=payload.is_active,
            updated_by_name=organization.name,
        )

        return jsonify(
            {
                "item": _serialize_agent(agent),
                "message": "Agent status updated",
                "email_sent": email_sent,
            }
        )


@organization_team_bp.delete("/agents/<account_id>")
def remove_organization_agent(account_id: str):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    organization = get_current_organization()
    if not organization:
        return auth_error_response()

    agent_id = resolve_agent_account_id(account_id)
    if not agent_id:
        return invalid_account_response()

    with get_db() as db:
        agent = get_agent_for_organization(db, agent_id, organization.id)
        if not agent:
            return jsonify({"detail": "Agent not found"}), 404

        snapshot = {"email": agent.email, "name": agent.name, "member_id": agent.id}
        delete_agent_for_organization(db, agent_id, organization.id)

        email_sent = send_team_member_deleted_email(
            role_label="Agent",
            to_email=snapshot["email"],
            name=snapshot["name"],
            member_id=snapshot["member_id"],
            deleted_by_name=organization.name,
        )

        return jsonify({"message": "Agent deleted", "email_sent": email_sent})
