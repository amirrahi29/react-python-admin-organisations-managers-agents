from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password, upgrade_password_hash_if_legacy, verify_password
from app.models.admin import ADMIN_ACTIVE, ADMIN_BLOCKED, Admin
from app.models.agent import AGENT_ACTIVE, Agent
from app.models.manager import MANAGER_ACTIVE, Manager
from app.models.organization import ORG_ACTIVE, Organization
from app.schemas.team import ActorInfo
from app.utils.account_ref import format_account_ref

def get_active_organization_by_id(db: Session, organization_id: int) -> Organization | None:
    org = (
        db.query(Organization)
        .options(joinedload(Organization.admin))
        .filter(Organization.id == organization_id, Organization.is_active == ORG_ACTIVE)
        .first()
    )
    if not org or not org.admin or org.admin.is_active != ADMIN_ACTIVE:
        return None
    return org


def authenticate_organization(
    db: Session, email: str, password: str
) -> tuple[Organization | None, str | None]:
    org = (
        db.query(Organization)
        .options(joinedload(Organization.admin))
        .filter(Organization.email == email.lower().strip())
        .first()
    )
    if not org:
        return None, None
    if not verify_password(password, org.password_hash):
        return None, None
    upgrade_password_hash_if_legacy(org, password)
    db.commit()
    if org.is_active != ORG_ACTIVE:
        return None, "blocked"
    admin = org.admin
    if not admin or admin.is_active != ADMIN_ACTIVE:
        return None, "blocked"
    return org, None


def serialize_organization_session(org: Organization) -> dict:
    from app.schemas.auth import OrganizationSessionResponse, RoleHierarchyMember

    admin = org.admin
    if not admin:
        raise ValueError("Organization hierarchy is incomplete")

    return OrganizationSessionResponse(
        id=org.id,
        name=org.name,
        email=org.email,
        created_at=org.created_at,
        updated_at=org.updated_at,
        admin=RoleHierarchyMember(role="Admin", name=admin.name, email=admin.email),
    ).model_dump(mode="json")


def change_organization_password(
    db: Session, organization_id: int, *, current_password: str, new_password: str
) -> tuple[Organization | None, str | None]:
    org = get_active_organization_by_id(db, organization_id)
    if not org:
        return None, "not_found"
    if not verify_password(current_password, org.password_hash):
        return None, "invalid"
    org.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(org)
    return org, None


def get_admin_by_email(db: Session, email: str) -> Admin | None:
    return db.query(Admin).filter(Admin.email == email.lower().strip()).first()


def create_admin(db: Session, email: str, password: str, name: str) -> Admin:
    admin = Admin(
        email=email.lower().strip(),
        password_hash=hash_password(password),
        name=name.strip(),
        is_active=ADMIN_ACTIVE,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def authenticate_admin(
    db: Session, email: str, password: str
) -> tuple[Admin | None, str | None]:
    admin = db.query(Admin).filter(Admin.email == email.lower().strip()).first()
    if not admin:
        return None, None
    if not verify_password(password, admin.password_hash):
        return None, None
    upgrade_password_hash_if_legacy(admin, password)
    db.commit()
    if admin.is_active != ADMIN_ACTIVE:
        return None, "blocked"
    return admin, None


def get_admin_by_id(db: Session, admin_id: int) -> Admin | None:
    return (
        db.query(Admin)
        .filter(Admin.id == admin_id, Admin.is_active == ADMIN_ACTIVE)
        .first()
    )


def update_admin_profile(
    db: Session,
    admin_id: int,
    *,
    name: str,
    phone: str | None = None,
    job_title: str | None = None,
) -> Admin | None:
    admin = get_admin_by_id(db, admin_id)
    if not admin:
        return None

    admin.name = name.strip()
    admin.phone = phone
    admin.job_title = job_title
    db.commit()
    db.refresh(admin)
    return admin


def set_admin_active(db: Session, email: str, active: bool) -> Admin | None:
    admin = db.query(Admin).filter(Admin.email == email.lower().strip()).first()
    if not admin:
        return None

    admin.is_active = ADMIN_ACTIVE if active else ADMIN_BLOCKED
    db.commit()
    db.refresh(admin)
    return admin


def authenticate_manager(
    db: Session, email: str, password: str
) -> tuple[Manager | None, str | None]:
    manager = (
        db.query(Manager)
        .options(
            joinedload(Manager.created_by_admin),
            joinedload(Manager.organization).joinedload(Organization.admin),
        )
        .filter(Manager.email == email.lower().strip())
        .first()
    )
    if not manager:
        return None, None
    if not verify_password(password, manager.password_hash):
        return None, None
    upgrade_password_hash_if_legacy(manager, password)
    db.commit()
    if manager.is_active != MANAGER_ACTIVE:
        return None, "blocked"
    org = manager.organization
    if not org or org.is_active != ORG_ACTIVE:
        return None, "blocked"
    admin = org.admin or manager.created_by_admin
    if not admin or admin.is_active != ADMIN_ACTIVE:
        return None, "blocked"
    return manager, None


def get_manager_by_id(db: Session, manager_id: int) -> Manager | None:
    manager = (
        db.query(Manager)
        .options(
            joinedload(Manager.created_by_admin),
            joinedload(Manager.organization).joinedload(Organization.admin),
        )
        .filter(Manager.id == manager_id, Manager.is_active == MANAGER_ACTIVE)
        .first()
    )
    if not manager:
        return None
    org = manager.organization
    if not org or org.is_active != ORG_ACTIVE:
        return None
    admin = org.admin or manager.created_by_admin
    if not admin or admin.is_active != ADMIN_ACTIVE:
        return None
    return manager


def _is_agent_login_allowed(agent: Agent) -> bool:
    if agent.is_active != AGENT_ACTIVE:
        return False
    manager = agent.manager
    if not manager or manager.is_active != MANAGER_ACTIVE:
        return False
    org = manager.organization
    if not org or org.is_active != ORG_ACTIVE:
        return False
    admin = org.admin or agent.created_by_admin
    if not admin or admin.is_active != ADMIN_ACTIVE:
        return False
    return True


def update_manager_profile(
    db: Session,
    manager_id: int,
    *,
    name: str,
    phone: str | None = None,
    job_title: str | None = None,
) -> Manager | None:
    manager = get_manager_by_id(db, manager_id)
    if not manager:
        return None

    manager.name = name.strip()
    manager.phone = phone
    manager.job_title = job_title
    db.commit()
    db.refresh(manager)
    return manager


def update_organization_profile(
    db: Session, organization_id: int, *, name: str
) -> Organization | None:
    org = get_active_organization_by_id(db, organization_id)
    if not org:
        return None
    org.name = name.strip()
    db.commit()
    db.refresh(org)
    return org


def serialize_manager_session(manager: Manager) -> dict:
    from app.schemas.auth import ManagerSessionResponse, RoleHierarchyMember

    org = manager.organization
    admin = (org.admin if org else None) or manager.created_by_admin
    if not admin or not org:
        raise ValueError("Manager hierarchy is incomplete")

    return ManagerSessionResponse(
        account_id=format_account_ref(role="manager", member_id=manager.id),
        email=manager.email,
        name=manager.name,
        phone=manager.phone,
        job_title=manager.job_title,
        created_at=manager.created_at,
        updated_at=manager.updated_at,
        admin=RoleHierarchyMember(role="Admin", name=admin.name, email=admin.email),
        organization=RoleHierarchyMember(role="Organization", name=org.name, email=org.email),
    ).model_dump(mode="json")


def authenticate_agent(
    db: Session, email: str, password: str
) -> tuple[Agent | None, str | None]:
    agent = (
        db.query(Agent)
        .options(
            joinedload(Agent.manager).joinedload(Manager.organization).joinedload(Organization.admin),
            joinedload(Agent.created_by_admin),
        )
        .filter(Agent.email == email.lower().strip())
        .first()
    )
    if not agent:
        return None, None
    if not verify_password(password, agent.password_hash):
        return None, None
    upgrade_password_hash_if_legacy(agent, password)
    db.commit()
    if not _is_agent_login_allowed(agent):
        return None, "blocked"
    return agent, None


def get_agent_by_id(db: Session, agent_id: int) -> Agent | None:
    agent = (
        db.query(Agent)
        .options(
            joinedload(Agent.manager).joinedload(Manager.organization).joinedload(Organization.admin),
            joinedload(Agent.created_by_admin),
        )
        .filter(Agent.id == agent_id, Agent.is_active == AGENT_ACTIVE)
        .first()
    )
    if not agent or not _is_agent_login_allowed(agent):
        return None
    return agent


def update_agent_profile(
    db: Session,
    agent_id: int,
    *,
    name: str,
    phone: str | None = None,
    job_title: str | None = None,
) -> Agent | None:
    agent = get_agent_by_id(db, agent_id)
    if not agent:
        return None

    agent.name = name.strip()
    agent.phone = phone
    agent.job_title = job_title
    db.commit()
    db.refresh(agent)
    return get_agent_by_id(db, agent_id)


def change_admin_password(
    db: Session, admin_id: int, *, current_password: str, new_password: str
) -> tuple[Admin | None, str | None]:
    admin = get_admin_by_id(db, admin_id)
    if not admin:
        return None, "not_found"
    if not verify_password(current_password, admin.password_hash):
        return None, "invalid"
    admin.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(admin)
    return admin, None


def change_manager_password(
    db: Session, manager_id: int, *, current_password: str, new_password: str
) -> tuple[Manager | None, str | None]:
    manager = get_manager_by_id(db, manager_id)
    if not manager:
        return None, "not_found"
    if not verify_password(current_password, manager.password_hash):
        return None, "invalid"
    manager.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(manager)
    return manager, None


def change_agent_password(
    db: Session, agent_id: int, *, current_password: str, new_password: str
) -> tuple[Agent | None, str | None]:
    agent = get_agent_by_id(db, agent_id)
    if not agent:
        return None, "not_found"
    if not verify_password(current_password, agent.password_hash):
        return None, "invalid"
    agent.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(agent)
    return agent, None


def serialize_agent_session(agent: Agent) -> dict:
    from app.schemas.auth import AgentSessionResponse, RoleHierarchyMember

    manager = agent.manager
    org = manager.organization if manager else None
    admin = (org.admin if org else None) or agent.created_by_admin
    if not admin or not manager or not org:
        raise ValueError("Agent hierarchy is incomplete")

    return AgentSessionResponse(
        account_id=format_account_ref(role="agent", member_id=agent.id),
        email=agent.email,
        name=agent.name,
        phone=agent.phone,
        job_title=agent.job_title,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        admin=RoleHierarchyMember(role="Admin", name=admin.name, email=admin.email),
        organization=RoleHierarchyMember(role="Organization", name=org.name, email=org.email),
        manager=RoleHierarchyMember(role="Manager", name=manager.name, email=manager.email),
    ).model_dump(mode="json")
