from contextlib import contextmanager
from collections.abc import Generator
from typing import Any

from flask import g, has_request_context, request
from sqlalchemy.orm import Session

from app.core.constants import JWT_COOKIE_NAME, ROLE_ADMIN, ROLE_AGENT, ROLE_MANAGER, ROLE_ORGANIZATION
from app.core.database import SessionLocal
from app.core.jwt import decode_access_token
from app.models.admin import Admin
from app.models.agent import Agent
from app.models.manager import Manager
from app.models.organization import Organization
from app.services.auth import get_admin_by_id, get_agent_by_id, get_manager_by_id, get_active_organization_by_id


@contextmanager
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _access_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.removeprefix("Bearer ").strip()
    return request.cookies.get(JWT_COOKIE_NAME)


def _request_cache_get(key: str) -> Any:
    """Return a cached value for this request, or ``None`` if absent.

    Many endpoints invoke ``get_current_*`` more than once per request (e.g.
    decorator + route handler + inner service). Each call previously opened a
    fresh DB session and re-queried the user — that's a needless round-trip on
    every protected request. By caching on ``flask.g`` we keep the contract
    identical while collapsing the work to a single fetch.
    """
    if not has_request_context():
        return None
    cache = getattr(g, "_auth_cache", None)
    if cache is None:
        return None
    return cache.get(key)


def _request_cache_set(key: str, value: Any) -> None:
    if not has_request_context():
        return
    cache = getattr(g, "_auth_cache", None)
    if cache is None:
        cache = {}
        g._auth_cache = cache
    cache[key] = value


def get_current_admin() -> Admin | None:
    cached = _request_cache_get("admin")
    if cached is not None:
        return cached
    admin_id = decode_access_token(_access_token() or "", expected_role=ROLE_ADMIN)
    if not admin_id:
        return None
    with get_db() as db:
        admin = get_admin_by_id(db, admin_id)
    if admin is not None:
        _request_cache_set("admin", admin)
    return admin


def get_current_manager() -> Manager | None:
    cached = _request_cache_get("manager")
    if cached is not None:
        return cached
    manager_id = decode_access_token(_access_token() or "", expected_role=ROLE_MANAGER)
    if not manager_id:
        return None
    with get_db() as db:
        manager = get_manager_by_id(db, manager_id)
    if manager is not None:
        _request_cache_set("manager", manager)
    return manager


def get_current_agent() -> Agent | None:
    cached = _request_cache_get("agent")
    if cached is not None:
        return cached
    agent_id = decode_access_token(_access_token() or "", expected_role=ROLE_AGENT)
    if not agent_id:
        return None
    with get_db() as db:
        agent = get_agent_by_id(db, agent_id)
    if agent is not None:
        _request_cache_set("agent", agent)
    return agent


def get_current_organization() -> Organization | None:
    cached = _request_cache_get("organization")
    if cached is not None:
        return cached
    organization_id = decode_access_token(_access_token() or "", expected_role=ROLE_ORGANIZATION)
    if not organization_id:
        return None
    with get_db() as db:
        org = get_active_organization_by_id(db, organization_id)
    if org is not None:
        _request_cache_set("organization", org)
    return org
