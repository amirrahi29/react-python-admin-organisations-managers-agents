from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.api.common import (
    auth_error_response,
    db_unavailable_response,
    list_pagination_params,
    parse_status_filter,
)
from app.api.deps import get_current_admin, get_db
from app.extensions.lifespan import ensure_db_ready
from app.schemas.organization import (
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
    StatusUpdateRequest,
)
from app.services.organizations import (
    create_organization,
    delete_organization,
    get_organization_by_id,
    is_organization_email_in_use,
    list_organizations,
    update_organization,
    update_organization_status,
)
from app.utils.pagination import pagination_meta

organizations_bp = Blueprint("organizations", __name__, url_prefix="/api/organizations")


@organizations_bp.get("")
def get_organizations():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    page, page_size, active_only = list_pagination_params(include_active_only=True)
    search = (request.args.get("search") or "").strip() or None
    is_active = parse_status_filter()
    with get_db() as db:
        items, total = list_organizations(
            db,
            admin_id=admin.id,
            page=page,
            page_size=page_size,
            active_only=active_only,
            is_active=is_active,
            search=search,
        )
        return jsonify(
            {
                "items": items,
                "pagination": pagination_meta(page=page, page_size=page_size, total=total),
            }
        )


@organizations_bp.post("")
def post_organization():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    try:
        payload = OrganizationCreateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        if is_organization_email_in_use(db, payload.email):
            return jsonify({"detail": "Email is already in use"}), 409

        org = create_organization(
            db,
            admin_id=admin.id,
            payload=payload,
        )
        if not org:
            return auth_error_response()
        from app.services.organizations import _serialize_organization

        return jsonify({"item": _serialize_organization(org)}), 201


@organizations_bp.get("/<int:organization_id>")
def get_organization(organization_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    with get_db() as db:
        org = get_organization_by_id(db, organization_id, admin.id)
        if not org:
            return jsonify({"detail": "Organization not found"}), 404
        from app.services.organizations import _manager_counts, _serialize_organization

        counts = _manager_counts(db, [org.id])
        return jsonify({"item": _serialize_organization(org, manager_count=counts.get(org.id, 0))})


@organizations_bp.patch("/<int:organization_id>")
def patch_organization(organization_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    try:
        payload = OrganizationUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        org = update_organization(db, organization_id, admin.id, name=payload.name)
        if not org:
            return jsonify({"detail": "Organization not found"}), 404
        return jsonify({"item": {"id": org.id, "name": org.name, "email": org.email, "is_active": org.is_active}})


@organizations_bp.patch("/<int:organization_id>/status")
def patch_organization_status(organization_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    try:
        payload = StatusUpdateRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        org = update_organization_status(
            db, organization_id, admin.id, is_active=payload.is_active
        )
        if not org:
            return jsonify({"detail": "Organization not found"}), 404
        return jsonify({"message": "Organization status updated", "is_active": org.is_active})


@organizations_bp.delete("/<int:organization_id>")
def delete_organization_route(organization_id: int):
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()
    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    with get_db() as db:
        try:
            org = delete_organization(db, organization_id, admin.id)
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 409
        if not org:
            return jsonify({"detail": "Organization not found"}), 404
        return jsonify({"message": "Organization deleted"})
