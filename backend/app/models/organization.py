from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.admin import ADMIN_ACTIVE

ORG_ACTIVE = ADMIN_ACTIVE
ORG_BLOCKED = 0


class Organization(Base):
    __tablename__ = "organization"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    admin_id: Mapped[int] = mapped_column(ForeignKey("admin.id", ondelete="CASCADE"), index=True)
    is_active: Mapped[int] = mapped_column(SmallInteger, default=ORG_ACTIVE, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    admin = relationship("Admin", foreign_keys=[admin_id])
    managers = relationship("Manager", back_populates="organization")

    @property
    def is_blocked(self) -> bool:
        return self.is_active != ORG_ACTIVE
