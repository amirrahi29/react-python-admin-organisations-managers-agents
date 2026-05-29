"""Shared helpers for API route modules."""

from flask import jsonify, request

from app.extensions.lifespan import ensure_db_ready

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100


def db_unavailable_response():
    _, error = ensure_db_ready()
    return jsonify({"detail": error or "Database not connected"}), 503


def auth_error_response():
    return jsonify({"detail": "Not authenticated"}), 401


def invalid_account_response():
    return jsonify({"detail": "Invalid account ID"}), 400


def list_pagination_params(*, include_active_only: bool = False) -> tuple[int, int] | tuple[int, int, bool]:
    page = request.args.get("page", default=1, type=int) or 1
    page_size = request.args.get("page_size", default=DEFAULT_PAGE_SIZE, type=int) or DEFAULT_PAGE_SIZE
    page = max(1, page)
    page_size = min(MAX_PAGE_SIZE, max(1, page_size))
    if not include_active_only:
        return page, page_size
    active_only = request.args.get("active_only", default="", type=str).lower() in {
        "1",
        "true",
        "yes",
    }
    return page, page_size, active_only


def parse_status_filter() -> bool | None:
    raw = (request.args.get("status") or "").strip().lower()
    if raw == "active":
        return True
    if raw in {"inactive", "blocked"}:
        return False
    return None


def email_is_taken(db, email: str) -> bool:
    from app.services.organizations import is_organization_email_in_use

    return is_organization_email_in_use(db, email)
