from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.models.admin import Admin
from app.models.agent import AGENT_ACTIVE, AGENT_BLOCKED, Agent
from app.models.manager import MANAGER_ACTIVE, MANAGER_BLOCKED, Manager
from app.models.organization import Organization
from app.utils.account_ref import format_account_ref, parse_account_ref
from app.utils.pagination import pagination_meta
from app.schemas.team import ActorInfo, AgentResponse, ManagerResponse
from app.services.auth import get_admin_by_id
from app.services.organization_scope import (
    agent_belongs_to_admin,
    manager_belongs_to_admin,
)
from app.services.organization_scope import get_active_organization_for_admin


def _created_by_name(admin: Admin) -> str:
    return admin.name.strip()


def _manager_actor(manager: Manager) -> ActorInfo:
    return ActorInfo(name=manager.name, email=manager.email)


def resolve_manager_account_id(account_id: str | None) -> int | None:
    if not account_id or not str(account_id).strip():
        return None
    try:
        role, member_id = parse_account_ref(account_id)
    except ValueError:
        return None
    if role != "manager":
        return None
    return member_id


def resolve_agent_account_id(account_id: str | None) -> int | None:
    if not account_id or not str(account_id).strip():
        return None
    try:
        role, member_id = parse_account_ref(account_id)
    except ValueError:
        return None
    if role != "agent":
        return None
    return member_id


def _serialize_manager(
    manager: Manager,
    *,
    agent_count: int = 0,
) -> dict:
    if not manager.organization:
        raise ValueError(f"Manager {manager.id} is missing required organization assignment")
    return ManagerResponse(
        account_id=format_account_ref(role="manager", member_id=manager.id),
        email=manager.email,
        name=manager.name,
        phone=manager.phone,
        job_title=manager.job_title,
        organization_id=manager.organization_id,
        organization_name=manager.organization.name,
        is_active=manager.is_active,
        agent_count=agent_count,
        created_at=manager.created_at.isoformat(),
        updated_at=manager.updated_at.isoformat(),
        created_by=_created_by_name(manager.created_by_admin),
    ).model_dump(mode="json")


def _manager_agent_counts(db: Session, manager_ids: list[int]) -> dict[int, int]:
    if not manager_ids:
        return {}
    rows = (
        db.query(Agent.manager_id, func.count(Agent.id))
        .filter(Agent.manager_id.in_(manager_ids))
        .group_by(Agent.manager_id)
        .all()
    )
    return {manager_id: int(count) for manager_id, count in rows}


def _managers_with_team_counts(db: Session, rows: list[Manager]) -> list[dict]:
    manager_ids = [row.id for row in rows]
    agent_counts = _manager_agent_counts(db, manager_ids)
    return [
        _serialize_manager(row, agent_count=agent_counts.get(row.id, 0))
        for row in rows
    ]


def _serialize_agent(agent: Agent) -> dict:
    if not agent.manager:
        raise ValueError(f"Agent {agent.id} is missing required manager assignment")
    org = agent.manager.organization
    return AgentResponse(
        account_id=format_account_ref(role="agent", member_id=agent.id),
        email=agent.email,
        name=agent.name,
        phone=agent.phone,
        job_title=agent.job_title,
        organization_id=org.id if org else None,
        organization_name=org.name if org else None,
        is_active=agent.is_active,
        created_at=agent.created_at.isoformat(),
        updated_at=agent.updated_at.isoformat(),
        created_by=_created_by_name(agent.created_by_admin),
        manager=_manager_actor(agent.manager),
    ).model_dump(mode="json")


def get_manager_for_admin(db: Session, manager_id: int, admin_id: int) -> Manager | None:
    manager = get_manager_by_id(db, manager_id)
    if not manager_belongs_to_admin(manager, admin_id):
        return None
    return manager


def get_agent_for_admin(db: Session, agent_id: int, admin_id: int) -> Agent | None:
    agent = get_agent_by_id(db, agent_id)
    if not agent_belongs_to_admin(agent, admin_id):
        return None
    return agent


def _apply_member_search(query, model, search: str | None):
    term = (search or "").strip()
    if not term:
        return query
    pattern = f"%{term}%"
    return query.filter(
        or_(
            model.name.ilike(pattern),
            model.email.ilike(pattern),
            model.phone.ilike(pattern),
            model.job_title.ilike(pattern),
        )
    )


def list_managers(
    db: Session,
    *,
    admin_id: int,
    page: int = 1,
    page_size: int = 10,
    active_only: bool = False,
    is_active: bool | None = None,
    search: str | None = None,
    organization_id: int | None = None,
) -> tuple[list[dict], int]:
    query = (
        db.query(Manager)
        .join(Organization, Organization.id == Manager.organization_id)
        .options(joinedload(Manager.created_by_admin), joinedload(Manager.organization))
        .filter(Organization.admin_id == admin_id)
    )
    if organization_id is not None:
        query = query.filter(Manager.organization_id == organization_id)
    if is_active is True or active_only:
        query = query.filter(Manager.is_active == MANAGER_ACTIVE)
    elif is_active is False:
        query = query.filter(Manager.is_active != MANAGER_ACTIVE)
    query = _apply_member_search(query, Manager, search)

    total = query.order_by(None).count()
    rows = (
        query.order_by(Manager.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return _managers_with_team_counts(db, rows), total


def list_agents(
    db: Session,
    *,
    admin_id: int,
    page: int = 1,
    page_size: int = 10,
    manager_id: int | None = None,
    organization_id: int | None = None,
    is_active: bool | None = None,
    search: str | None = None,
) -> tuple[list[dict], int]:
    query = (
        db.query(Agent)
        .join(Manager, Manager.id == Agent.manager_id)
        .join(Organization, Organization.id == Manager.organization_id)
        .options(
            joinedload(Agent.created_by_admin),
            joinedload(Agent.manager).joinedload(Manager.organization),
        )
        .filter(Organization.admin_id == admin_id)
    )
    if organization_id is not None:
        query = query.filter(Manager.organization_id == organization_id)
    if manager_id is not None:
        query = query.filter(Agent.manager_id == manager_id)
    if is_active is True:
        query = query.filter(Agent.is_active == AGENT_ACTIVE)
    elif is_active is False:
        query = query.filter(Agent.is_active != AGENT_ACTIVE)
    query = _apply_member_search(query, Agent, search)
    total = query.order_by(None).count()
    rows = (
        query.order_by(Agent.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_serialize_agent(row) for row in rows], total


def get_manager_by_email(db: Session, email: str) -> Manager | None:
    return db.query(Manager).filter(Manager.email == email.lower().strip()).first()


def get_agent_by_email(db: Session, email: str) -> Agent | None:
    return db.query(Agent).filter(Agent.email == email.lower().strip()).first()


def get_manager_by_id(db: Session, manager_id: int) -> Manager | None:
    return (
        db.query(Manager)
        .options(joinedload(Manager.created_by_admin), joinedload(Manager.organization))
        .filter(Manager.id == manager_id)
        .first()
    )


def get_agent_by_id(db: Session, agent_id: int) -> Agent | None:
    return (
        db.query(Agent)
        .options(
            joinedload(Agent.created_by_admin),
            joinedload(Agent.manager).joinedload(Manager.organization),
        )
        .filter(Agent.id == agent_id)
        .first()
    )


def create_manager(
    db: Session,
    *,
    admin_id: int,
    email: str,
    password: str,
    name: str,
    organization_id: int,
    phone: str | None = None,
    job_title: str | None = None,
) -> Manager | None:
    admin = get_admin_by_id(db, admin_id)
    if not admin:
        return None

    org = get_active_organization_for_admin(db, organization_id, admin_id)
    if not org:
        return None

    manager = Manager(
        email=email.lower().strip(),
        password_hash=hash_password(password),
        name=name.strip(),
        phone=phone,
        job_title=job_title,
        is_active=MANAGER_ACTIVE,
        organization_id=org.id,
        created_by_admin_id=admin.id,
    )
    db.add(manager)
    db.commit()
    db.refresh(manager)
    return get_manager_by_id(db, manager.id)


def create_agent(
    db: Session,
    *,
    admin_id: int,
    email: str,
    password: str,
    name: str,
    manager_id: int,
    phone: str | None = None,
    job_title: str | None = None,
) -> Agent | None:
    admin = get_admin_by_id(db, admin_id)
    if not admin:
        return None

    manager = get_manager_for_admin(db, manager_id, admin_id)
    if not manager or manager.is_active != MANAGER_ACTIVE:
        return None

    agent = Agent(
        email=email.lower().strip(),
        password_hash=hash_password(password),
        name=name.strip(),
        phone=phone,
        job_title=job_title,
        is_active=AGENT_ACTIVE,
        created_by_admin_id=admin.id,
        manager_id=manager.id,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return get_agent_by_id(db, agent.id)


def update_manager(
    db: Session,
    manager_id: int,
    admin_id: int,
    *,
    name: str,
    phone: str,
    job_title: str,
) -> Manager | None:
    manager = get_manager_for_admin(db, manager_id, admin_id)
    if not manager:
        return None
    manager.name = name.strip()
    manager.phone = phone.strip()
    manager.job_title = job_title.strip()
    db.commit()
    db.refresh(manager)
    return get_manager_by_id(db, manager.id)


def update_agent(
    db: Session,
    agent_id: int,
    admin_id: int,
    *,
    name: str,
    phone: str,
    job_title: str,
    manager_id: int,
) -> Agent | None:
    agent = get_agent_for_admin(db, agent_id, admin_id)
    if not agent:
        return None

    manager = get_manager_for_admin(db, manager_id, admin_id)
    if not manager or manager.is_active != MANAGER_ACTIVE:
        return None

    agent.name = name.strip()
    agent.phone = phone.strip()
    agent.job_title = job_title.strip()
    agent.manager_id = manager.id
    db.commit()
    db.refresh(agent)
    return get_agent_by_id(db, agent.id)


def update_manager_status(
    db: Session, manager_id: int, admin_id: int, *, is_active: bool
) -> Manager | None:
    manager = get_manager_for_admin(db, manager_id, admin_id)
    if not manager:
        return None
    manager.is_active = MANAGER_ACTIVE if is_active else MANAGER_BLOCKED
    db.commit()
    db.refresh(manager)
    return get_manager_by_id(db, manager.id)


def update_agent_status(
    db: Session, agent_id: int, admin_id: int, *, is_active: bool
) -> Agent | None:
    agent = get_agent_for_admin(db, agent_id, admin_id)
    if not agent:
        return None
    agent.is_active = AGENT_ACTIVE if is_active else AGENT_BLOCKED
    db.commit()
    db.refresh(agent)
    return get_agent_by_id(db, agent.id)


def delete_manager(db: Session, manager_id: int, admin_id: int) -> Manager | None:
    manager = get_manager_for_admin(db, manager_id, admin_id)
    if not manager:
        return None
    db.delete(manager)
    db.commit()
    return manager


def delete_agent(db: Session, agent_id: int, admin_id: int) -> Agent | None:
    agent = get_agent_for_admin(db, agent_id, admin_id)
    if not agent:
        return None
    db.delete(agent)
    db.commit()
    return agent


def _serialize_manager_scoped_agent(agent: Agent) -> dict:
    from app.schemas.team import ManagerScopedAgentResponse

    if not agent.manager:
        raise ValueError(f"Agent {agent.id} is missing required manager assignment")

    return ManagerScopedAgentResponse(
        account_id=format_account_ref(role="agent", member_id=agent.id),
        email=agent.email,
        name=agent.name,
        phone=agent.phone,
        job_title=agent.job_title,
        is_active=agent.is_active,
        created_at=agent.created_at.isoformat(),
        updated_at=agent.updated_at.isoformat(),
        created_by=_created_by_name(agent.created_by_admin),
        manager=_manager_actor(agent.manager),
    ).model_dump(mode="json")


def list_agents_for_manager(
    db: Session,
    manager_id: int,
    *,
    page: int = 1,
    page_size: int = 10,
    is_active: bool | None = None,
    search: str | None = None,
) -> tuple[list[dict], int]:
    query = (
        db.query(Agent)
        .options(
            joinedload(Agent.created_by_admin),
            joinedload(Agent.manager),
        )
        .filter(Agent.manager_id == manager_id)
    )
    if is_active is True:
        query = query.filter(Agent.is_active == AGENT_ACTIVE)
    elif is_active is False:
        query = query.filter(Agent.is_active != AGENT_ACTIVE)
    query = _apply_member_search(query, Agent, search)
    total = query.order_by(None).count()
    rows = (
        query.order_by(Agent.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_serialize_manager_scoped_agent(row) for row in rows], total


def get_agent_for_manager(db: Session, agent_id: int, manager_id: int) -> Agent | None:
    agent = get_agent_by_id(db, agent_id)
    if not agent or agent.manager_id != manager_id:
        return None
    return agent


def create_agent_for_manager(
    db: Session,
    manager: Manager,
    *,
    email: str,
    password: str,
    name: str,
    phone: str | None = None,
    job_title: str | None = None,
) -> Agent | None:
    if manager.is_active != MANAGER_ACTIVE:
        return None

    agent = Agent(
        email=email.lower().strip(),
        password_hash=hash_password(password),
        name=name.strip(),
        phone=phone,
        job_title=job_title,
        is_active=AGENT_ACTIVE,
        created_by_admin_id=manager.created_by_admin_id,
        manager_id=manager.id,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return get_agent_for_manager(db, agent.id, manager.id)


def update_agent_for_manager(
    db: Session,
    agent_id: int,
    manager_id: int,
    *,
    name: str,
    phone: str,
    job_title: str,
) -> Agent | None:
    agent = get_agent_for_manager(db, agent_id, manager_id)
    if not agent:
        return None

    agent.name = name.strip()
    agent.phone = phone.strip()
    agent.job_title = job_title.strip()
    db.commit()
    db.refresh(agent)
    return get_agent_for_manager(db, agent.id, manager_id)


def update_agent_status_for_manager(
    db: Session, agent_id: int, manager_id: int, *, is_active: bool
) -> Agent | None:
    agent = get_agent_for_manager(db, agent_id, manager_id)
    if not agent:
        return None
    agent.is_active = AGENT_ACTIVE if is_active else AGENT_BLOCKED
    db.commit()
    db.refresh(agent)
    return get_agent_for_manager(db, agent.id, manager_id)


def delete_agent_for_manager(db: Session, agent_id: int, manager_id: int) -> Agent | None:
    agent = get_agent_for_manager(db, agent_id, manager_id)
    if not agent:
        return None
    db.delete(agent)
    db.commit()
    return agent


def list_managers_for_organization(
    db: Session,
    *,
    organization_id: int,
    page: int = 1,
    page_size: int = 10,
    is_active: bool | None = None,
    search: str | None = None,
) -> tuple[list[dict], int]:
    query = (
        db.query(Manager)
        .options(joinedload(Manager.created_by_admin), joinedload(Manager.organization))
        .filter(Manager.organization_id == organization_id)
    )
    if is_active is True:
        query = query.filter(Manager.is_active == MANAGER_ACTIVE)
    elif is_active is False:
        query = query.filter(Manager.is_active != MANAGER_ACTIVE)
    query = _apply_member_search(query, Manager, search)

    total = query.order_by(None).count()
    rows = (
        query.order_by(Manager.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return _managers_with_team_counts(db, rows), total


def list_agents_for_organization(
    db: Session,
    *,
    organization_id: int,
    page: int = 1,
    page_size: int = 10,
    manager_id: int | None = None,
    is_active: bool | None = None,
    search: str | None = None,
) -> tuple[list[dict], int]:
    query = (
        db.query(Agent)
        .join(Manager, Manager.id == Agent.manager_id)
        .options(
            joinedload(Agent.created_by_admin),
            joinedload(Agent.manager).joinedload(Manager.organization),
        )
        .filter(Manager.organization_id == organization_id)
    )
    if manager_id is not None:
        query = query.filter(Agent.manager_id == manager_id)
    if is_active is True:
        query = query.filter(Agent.is_active == AGENT_ACTIVE)
    elif is_active is False:
        query = query.filter(Agent.is_active != AGENT_ACTIVE)
    query = _apply_member_search(query, Agent, search)

    total = query.order_by(None).count()
    rows = (
        query.order_by(Agent.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_serialize_agent(row) for row in rows], total


def get_manager_for_organization(
    db: Session, manager_id: int, organization_id: int
) -> Manager | None:
    manager = get_manager_by_id(db, manager_id)
    if not manager or manager.organization_id != organization_id:
        return None
    return manager


def get_agent_for_organization(
    db: Session, agent_id: int, organization_id: int
) -> Agent | None:
    agent = get_agent_by_id(db, agent_id)
    if not agent or not agent.manager or agent.manager.organization_id != organization_id:
        return None
    return agent


def create_manager_for_organization(
    db: Session,
    organization: Organization,
    *,
    email: str,
    password: str,
    name: str,
    phone: str | None = None,
    job_title: str | None = None,
) -> Manager | None:
    if organization.is_blocked:
        return None

    manager = Manager(
        email=email.lower().strip(),
        password_hash=hash_password(password),
        name=name.strip(),
        phone=phone,
        job_title=job_title,
        is_active=MANAGER_ACTIVE,
        organization_id=organization.id,
        created_by_admin_id=organization.admin_id,
    )
    db.add(manager)
    db.commit()
    db.refresh(manager)
    return get_manager_for_organization(db, manager.id, organization.id)


def create_agent_for_organization(
    db: Session,
    organization: Organization,
    *,
    manager_id: int,
    email: str,
    password: str,
    name: str,
    phone: str | None = None,
    job_title: str | None = None,
) -> Agent | None:
    manager = get_manager_for_organization(db, manager_id, organization.id)
    if not manager or manager.is_active != MANAGER_ACTIVE:
        return None

    agent = Agent(
        email=email.lower().strip(),
        password_hash=hash_password(password),
        name=name.strip(),
        phone=phone,
        job_title=job_title,
        is_active=AGENT_ACTIVE,
        created_by_admin_id=organization.admin_id,
        manager_id=manager.id,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return get_agent_for_organization(db, agent.id, organization.id)


def update_manager_for_organization(
    db: Session,
    manager_id: int,
    organization_id: int,
    *,
    name: str,
    phone: str,
    job_title: str,
) -> Manager | None:
    manager = get_manager_for_organization(db, manager_id, organization_id)
    if not manager:
        return None
    manager.name = name.strip()
    manager.phone = phone.strip()
    manager.job_title = job_title.strip()
    db.commit()
    db.refresh(manager)
    return get_manager_by_id(db, manager.id)


def update_agent_for_organization(
    db: Session,
    agent_id: int,
    organization_id: int,
    *,
    name: str,
    phone: str,
    job_title: str,
    manager_id: int,
) -> Agent | None:
    agent = get_agent_for_organization(db, agent_id, organization_id)
    if not agent:
        return None

    manager = get_manager_for_organization(db, manager_id, organization_id)
    if not manager or manager.is_active != MANAGER_ACTIVE:
        return None

    agent.name = name.strip()
    agent.phone = phone.strip()
    agent.job_title = job_title.strip()
    agent.manager_id = manager.id
    db.commit()
    db.refresh(agent)
    return get_agent_for_organization(db, agent.id, organization_id)


def update_manager_status_for_organization(
    db: Session, manager_id: int, organization_id: int, *, is_active: bool
) -> Manager | None:
    manager = get_manager_for_organization(db, manager_id, organization_id)
    if not manager:
        return None
    manager.is_active = MANAGER_ACTIVE if is_active else MANAGER_BLOCKED
    db.commit()
    db.refresh(manager)
    return get_manager_by_id(db, manager.id)


def update_agent_status_for_organization(
    db: Session, agent_id: int, organization_id: int, *, is_active: bool
) -> Agent | None:
    agent = get_agent_for_organization(db, agent_id, organization_id)
    if not agent:
        return None
    agent.is_active = AGENT_ACTIVE if is_active else AGENT_BLOCKED
    db.commit()
    db.refresh(agent)
    return get_agent_for_organization(db, agent.id, organization_id)


def delete_manager_for_organization(
    db: Session, manager_id: int, organization_id: int
) -> Manager | None:
    manager = get_manager_for_organization(db, manager_id, organization_id)
    if not manager:
        return None
    db.delete(manager)
    db.commit()
    return manager


def delete_agent_for_organization(
    db: Session, agent_id: int, organization_id: int
) -> Agent | None:
    agent = get_agent_for_organization(db, agent_id, organization_id)
    if not agent:
        return None
    db.delete(agent)
    db.commit()
    return agent
