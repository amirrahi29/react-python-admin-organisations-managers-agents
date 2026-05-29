from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.manager import Manager
from app.models.organization import ORG_ACTIVE, Organization


def admin_organizations_query(db: Session, admin_id: int):
    return db.query(Organization).filter(
        Organization.admin_id == admin_id,
        Organization.is_active == ORG_ACTIVE,
    )


def get_organization_for_admin(
    db: Session, organization_id: int, admin_id: int
) -> Organization | None:
    return (
        db.query(Organization)
        .filter(
            Organization.id == organization_id,
            Organization.admin_id == admin_id,
        )
        .first()
    )


def get_active_organization_for_admin(
    db: Session, organization_id: int, admin_id: int
) -> Organization | None:
    return (
        admin_organizations_query(db, admin_id)
        .filter(Organization.id == organization_id)
        .first()
    )


def admin_manager_ids_subquery(admin_id: int, organization_id: int | None = None):
    stmt = (
        select(Manager.id)
        .join(Organization, Organization.id == Manager.organization_id)
        .where(Organization.admin_id == admin_id)
    )
    if organization_id is not None:
        stmt = stmt.where(Manager.organization_id == organization_id)
    return stmt


def admin_agent_ids_subquery(admin_id: int, organization_id: int | None = None):
    stmt = (
        select(Agent.id)
        .join(Manager, Manager.id == Agent.manager_id)
        .join(Organization, Organization.id == Manager.organization_id)
        .where(Organization.admin_id == admin_id)
    )
    if organization_id is not None:
        stmt = stmt.where(Manager.organization_id == organization_id)
    return stmt


def manager_belongs_to_admin(manager: Manager | None, admin_id: int) -> bool:
    if not manager or not manager.organization:
        return False
    return manager.organization.admin_id == admin_id


def agent_belongs_to_admin(agent: Agent | None, admin_id: int) -> bool:
    if not agent or not agent.manager or not agent.manager.organization:
        return False
    return agent.manager.organization.admin_id == admin_id
