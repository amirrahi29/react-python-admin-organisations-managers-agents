from __future__ import annotations

import time
from threading import Lock

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.agent import AGENT_ACTIVE, Agent
from app.models.manager import MANAGER_ACTIVE, Manager
from app.models.organization import ORG_ACTIVE, Organization
from app.services.organization_scope import admin_agent_ids_subquery, admin_manager_ids_subquery
from app.utils.account_ref import format_account_ref

_DASHBOARD_STATS_CACHE: dict[tuple[str, int], tuple[float, dict]] = {}
_DASHBOARD_STATS_CACHE_LOCK = Lock()
_DASHBOARD_STATS_CACHE_TTL_SECONDS = 15


def _read_dashboard_stats_cache(scope: str, scope_id: int) -> dict | None:
    with _DASHBOARD_STATS_CACHE_LOCK:
        entry = _DASHBOARD_STATS_CACHE.get((scope, scope_id))
        if not entry:
            return None
        cached_at, payload = entry
        if time.monotonic() - cached_at > _DASHBOARD_STATS_CACHE_TTL_SECONDS:
            _DASHBOARD_STATS_CACHE.pop((scope, scope_id), None)
            return None
        return payload


def _write_dashboard_stats_cache(scope: str, scope_id: int, payload: dict) -> None:
    with _DASHBOARD_STATS_CACHE_LOCK:
        _DASHBOARD_STATS_CACHE[(scope, scope_id)] = (time.monotonic(), payload)


def get_admin_dashboard_stats(db: Session, admin_id: int) -> dict:
    organizations = (
        db.query(Organization)
        .filter(Organization.admin_id == admin_id)
        .order_by(Organization.name.asc())
        .all()
    )
    org_ids = [org.id for org in organizations]

    manager_query = db.query(Manager).filter(Manager.id.in_(admin_manager_ids_subquery(admin_id)))
    total_managers = manager_query.count()
    active_managers = manager_query.filter(Manager.is_active == MANAGER_ACTIVE).count()

    agent_query = db.query(Agent).filter(Agent.id.in_(admin_agent_ids_subquery(admin_id)))
    total_agents = agent_query.count()
    active_agents = agent_query.filter(Agent.is_active == AGENT_ACTIVE).count()

    manager_counts: dict[int, int] = {}
    if org_ids:
        rows = (
            db.query(Manager.organization_id, func.count(Manager.id))
            .filter(Manager.organization_id.in_(org_ids))
            .group_by(Manager.organization_id)
            .all()
        )
        manager_counts = {org_id: int(count) for org_id, count in rows}

    agent_counts_by_org: dict[int, int] = {}
    if org_ids:
        rows = (
            db.query(Manager.organization_id, func.count(Agent.id))
            .join(Agent, Agent.manager_id == Manager.id)
            .filter(Manager.organization_id.in_(org_ids))
            .group_by(Manager.organization_id)
            .all()
        )
        agent_counts_by_org = {org_id: int(count) for org_id, count in rows}

    organization_overview = [
        {
            "organization_id": org.id,
            "name": org.name,
            "is_active": org.is_active == ORG_ACTIVE,
            "manager_count": manager_counts.get(org.id, 0),
            "agent_count": agent_counts_by_org.get(org.id, 0),
        }
        for org in organizations
    ]

    managers = (
        db.query(Manager)
        .options(joinedload(Manager.organization))
        .filter(Manager.id.in_(admin_manager_ids_subquery(admin_id)))
        .order_by(Manager.name.asc())
        .all()
    )
    manager_agent_counts: dict[int, int] = {}
    if managers:
        rows = (
            db.query(Agent.manager_id, func.count(Agent.id))
            .filter(Agent.manager_id.in_([manager.id for manager in managers]))
            .group_by(Agent.manager_id)
            .all()
        )
        manager_agent_counts = {manager_id: int(count) for manager_id, count in rows}

    manager_overview = [
        {
            "manager_id": manager.id,
            "account_id": format_account_ref(role="manager", member_id=manager.id),
            "name": manager.name,
            "organization_id": manager.organization_id,
            "organization_name": manager.organization.name if manager.organization else None,
            "is_active": manager.is_active == MANAGER_ACTIVE,
            "agent_count": manager_agent_counts.get(manager.id, 0),
        }
        for manager in managers
    ]

    return {
        "summary": {
            "organizations": len(organizations),
            "active_organizations": sum(1 for org in organizations if org.is_active == ORG_ACTIVE),
            "managers": total_managers,
            "active_managers": active_managers,
            "agents": total_agents,
            "active_agents": active_agents,
        },
        "organization_overview": organization_overview,
        "manager_overview": manager_overview,
    }


def get_admin_dashboard_stats_cached(db: Session, admin_id: int) -> dict:
    cached = _read_dashboard_stats_cache("admin", admin_id)
    if cached is not None:
        return cached
    payload = get_admin_dashboard_stats(db, admin_id)
    _write_dashboard_stats_cache("admin", admin_id, payload)
    return payload


def get_manager_dashboard_stats(db: Session, manager_id: int) -> dict:
    agents = (
        db.query(Agent)
        .filter(Agent.manager_id == manager_id)
        .order_by(Agent.name.asc())
        .all()
    )
    total_agents = len(agents)
    active_agents = sum(1 for agent in agents if agent.is_active == AGENT_ACTIVE)
    return {
        "summary": {
            "agents": total_agents,
            "active_agents": active_agents,
            "blocked_agents": total_agents - active_agents,
        },
        "agents": [
            {
                "agent_id": agent.id,
                "account_id": format_account_ref(role="agent", member_id=agent.id),
                "name": agent.name,
                "email": agent.email,
                "is_active": agent.is_active == AGENT_ACTIVE,
            }
            for agent in agents
        ],
    }


def get_manager_dashboard_stats_cached(db: Session, manager_id: int) -> dict:
    cached = _read_dashboard_stats_cache("manager", manager_id)
    if cached is not None:
        return cached
    payload = get_manager_dashboard_stats(db, manager_id)
    _write_dashboard_stats_cache("manager", manager_id, payload)
    return payload


def get_organization_dashboard_stats(db: Session, organization_id: int) -> dict:
    managers = (
        db.query(Manager)
        .filter(Manager.organization_id == organization_id)
        .order_by(Manager.name.asc())
        .all()
    )
    agents = (
        db.query(Agent)
        .join(Manager, Manager.id == Agent.manager_id)
        .options(joinedload(Agent.manager))
        .filter(Manager.organization_id == organization_id)
        .order_by(Agent.name.asc())
        .all()
    )

    total_managers = len(managers)
    active_managers = sum(1 for manager in managers if manager.is_active == MANAGER_ACTIVE)
    total_agents = len(agents)
    active_agents = sum(1 for agent in agents if agent.is_active == AGENT_ACTIVE)

    manager_agent_counts: dict[int, int] = {}
    if managers:
        rows = (
            db.query(Agent.manager_id, func.count(Agent.id))
            .filter(Agent.manager_id.in_([manager.id for manager in managers]))
            .group_by(Agent.manager_id)
            .all()
        )
        manager_agent_counts = {manager_id: int(count) for manager_id, count in rows}

    return {
        "summary": {
            "managers": total_managers,
            "active_managers": active_managers,
            "blocked_managers": total_managers - active_managers,
            "agents": total_agents,
            "active_agents": active_agents,
            "blocked_agents": total_agents - active_agents,
        },
        "managers": [
            {
                "manager_id": manager.id,
                "account_id": format_account_ref(role="manager", member_id=manager.id),
                "name": manager.name,
                "email": manager.email,
                "phone": manager.phone,
                "job_title": manager.job_title,
                "is_active": manager.is_active == MANAGER_ACTIVE,
                "agent_count": manager_agent_counts.get(manager.id, 0),
            }
            for manager in managers
        ],
        "agents": [
            {
                "agent_id": agent.id,
                "account_id": format_account_ref(role="agent", member_id=agent.id),
                "name": agent.name,
                "email": agent.email,
                "phone": agent.phone,
                "job_title": agent.job_title,
                "is_active": agent.is_active == AGENT_ACTIVE,
                "manager_name": agent.manager.name if agent.manager else None,
                "manager_email": agent.manager.email if agent.manager else None,
            }
            for agent in agents
        ],
    }


def get_organization_dashboard_stats_cached(db: Session, organization_id: int) -> dict:
    cached = _read_dashboard_stats_cache("organization", organization_id)
    if cached is not None:
        return cached
    payload = get_organization_dashboard_stats(db, organization_id)
    _write_dashboard_stats_cache("organization", organization_id, payload)
    return payload


def get_agent_dashboard_stats(db: Session, agent_id: int) -> dict:
    agent = (
        db.query(Agent)
        .options(
            joinedload(Agent.manager).joinedload(Manager.organization),
        )
        .filter(Agent.id == agent_id)
        .first()
    )
    if not agent:
        raise ValueError(f"Agent {agent_id} not found")

    manager = agent.manager
    organization = manager.organization if manager else None
    return {
        "summary": {
            "status": "active" if agent.is_active == AGENT_ACTIVE else "blocked",
        },
        "agent": {
            "account_id": format_account_ref(role="agent", member_id=agent.id),
            "name": agent.name,
            "email": agent.email,
            "job_title": agent.job_title,
        },
        "manager": {
            "account_id": format_account_ref(role="manager", member_id=manager.id),
            "name": manager.name,
            "email": manager.email,
        }
        if manager
        else None,
        "organization": {
            "id": organization.id,
            "name": organization.name,
        }
        if organization
        else None,
    }


def get_agent_dashboard_stats_cached(db: Session, agent_id: int) -> dict:
    cached = _read_dashboard_stats_cache("agent", agent_id)
    if cached is not None:
        return cached
    payload = get_agent_dashboard_stats(db, agent_id)
    _write_dashboard_stats_cache("agent", agent_id, payload)
    return payload
