from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

USER_TYPE_MANAGER = "manager"
USER_TYPE_AGENT = "agent"

SESSION_ONLINE = "online"
SESSION_IDLE = "idle"
SESSION_OFFLINE = "offline"

EVENT_LOGIN = "login"
EVENT_LOGOUT = "logout"
EVENT_HEARTBEAT = "heartbeat"
EVENT_IDLE_START = "idle_start"
EVENT_IDLE_END = "idle_end"
EVENT_ACTIVE = "active"


class AttendanceSession(Base):
    __tablename__ = "attendance_session"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_type: Mapped[str] = mapped_column(String(20), index=True)
    user_id: Mapped[int] = mapped_column(index=True)
    login_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    logout_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=SESSION_ONLINE, server_default=SESSION_ONLINE)
    idle_since: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_attendance_session_user", "user_type", "user_id"),
        Index("ix_attendance_session_login_at", "login_at"),
    )


class AttendanceEvent(Base):
    __tablename__ = "attendance_event"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int | None] = mapped_column(
        ForeignKey("attendance_session.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_type: Mapped[str] = mapped_column(String(20), index=True)
    user_id: Mapped[int] = mapped_column(index=True)
    event_type: Mapped[str] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_attendance_event_user_created", "user_type", "user_id", "created_at"),
    )
