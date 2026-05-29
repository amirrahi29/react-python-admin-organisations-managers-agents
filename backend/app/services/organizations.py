from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.admin import ADMIN_ACTIVE, Admin
from app.models.agent import Agent
from app.models.manager import MANAGER_ACTIVE, Manager
from app.models.organization import ORG_ACTIVE, ORG_BLOCKED, Organization
from app.services.organization_scope import (
    get_active_organization_for_admin,
    get_organization_for_admin,
)
from app.schemas.organization import OrganizationCreateRequest, OrganizationResponse


def _serialize_organization(org: Organization, *, manager_count: int = 0) -> dict:
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        email=org.email,
        is_active=org.is_active,
        manager_count=manager_count,
        created_at=org.created_at.isoformat(),
        updated_at=org.updated_at.isoformat(),
    ).model_dump(mode="json")


def _manager_counts(db: Session, org_ids: list[int]) -> dict[int, int]:
    if not org_ids:
        return {}
    rows = (
        db.query(Manager.organization_id, func.count(Manager.id))
        .filter(Manager.organization_id.in_(org_ids))
        .group_by(Manager.organization_id)
        .all()
    )
    return {org_id: int(count) for org_id, count in rows}


def get_organization_by_email(db: Session, email: str) -> Organization | None:
    return db.query(Organization).filter(Organization.email == email.lower().strip()).first()


def list_organizations(
    db: Session,
    *,
    admin_id: int,
    page: int = 1,
    page_size: int = 10,
    active_only: bool = False,
    is_active: bool | None = None,
    search: str | None = None,
) -> tuple[list[dict], int]:
    query = db.query(Organization).filter(Organization.admin_id == admin_id)
    if is_active is True or active_only:
        query = query.filter(Organization.is_active == ORG_ACTIVE)
    elif is_active is False:
        query = query.filter(Organization.is_active != ORG_ACTIVE)
    term = (search or "").strip()
    if term:
        query = query.filter(
            Organization.name.ilike(f"%{term}%")
            | Organization.email.ilike(f"%{term}%")
        )
    total = query.order_by(None).count()
    rows = (
        query.order_by(Organization.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    counts = _manager_counts(db, [row.id for row in rows])
    items = [_serialize_organization(row, manager_count=counts.get(row.id, 0)) for row in rows]
    return items, total


def get_organization_by_id(db: Session, organization_id: int, admin_id: int) -> Organization | None:
    return get_organization_for_admin(db, organization_id, admin_id)


def create_organization(
    db: Session,
    *,
    admin_id: int,
    payload: OrganizationCreateRequest,
) -> Organization | None:
    admin = (
        db.query(Admin)
        .filter(Admin.id == admin_id, Admin.is_active == ADMIN_ACTIVE)
        .first()
    )
    if not admin:
        return None
    org = Organization(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        admin_id=admin.id,
        is_active=ORG_ACTIVE,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def update_organization(
    db: Session,
    organization_id: int,
    admin_id: int,
    *,
    name: str,
) -> Organization | None:
    org = get_organization_for_admin(db, organization_id, admin_id)
    if not org:
        return None
    org.name = name.strip()
    db.commit()
    db.refresh(org)
    return org


def update_organization_status(
    db: Session, organization_id: int, admin_id: int, *, is_active: bool
) -> Organization | None:
    org = get_organization_for_admin(db, organization_id, admin_id)
    if not org:
        return None
    org.is_active = ORG_ACTIVE if is_active else ORG_BLOCKED
    db.commit()
    db.refresh(org)
    return org


def delete_organization(db: Session, organization_id: int, admin_id: int) -> Organization | None:
    org = get_organization_for_admin(db, organization_id, admin_id)
    if not org:
        return None
    manager_count = (
        db.query(Manager).filter(Manager.organization_id == org.id).count()
    )
    if manager_count > 0:
        raise ValueError("Cannot delete an organization that still has managers.")
    db.delete(org)
    db.commit()
    return org


def resolve_organization_id_for_admin(
    db: Session, admin_id: int, organization_id: int | None
) -> int | None:
    if organization_id is None:
        return None
    org = get_active_organization_for_admin(db, organization_id, admin_id)
    return org.id if org else None


def is_organization_email_in_use(db: Session, email: str) -> bool:
    normalized = email.lower().strip()
    if db.query(Admin).filter(Admin.email == normalized).first():
        return True
    if db.query(Organization).filter(Organization.email == normalized).first():
        return True
    if db.query(Manager).filter(Manager.email == normalized).first():
        return True
    if db.query(Agent).filter(Agent.email == normalized).first():
        return True
    return False
