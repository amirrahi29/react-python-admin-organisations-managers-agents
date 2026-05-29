from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.admin import ADMIN_ACTIVE

MANAGER_ACTIVE = ADMIN_ACTIVE
MANAGER_BLOCKED = 0


class Manager(Base):
    __tablename__ = "manager"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[int] = mapped_column(SmallInteger, default=MANAGER_ACTIVE, server_default="1")
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organization.id", ondelete="RESTRICT"), index=True
    )
    created_by_admin_id: Mapped[int] = mapped_column(ForeignKey("admin.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    organization = relationship("Organization", back_populates="managers")
    created_by_admin = relationship("Admin", foreign_keys=[created_by_admin_id])
    agents = relationship("Agent", back_populates="manager")

    @property
    def is_blocked(self) -> bool:
        return self.is_active != MANAGER_ACTIVE
