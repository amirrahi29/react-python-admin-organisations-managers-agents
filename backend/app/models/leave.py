from datetime import date, datetime

from sqlalchemy import Date, DateTime, Index, Numeric, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

REQUESTER_MANAGER = "manager"
REQUESTER_AGENT = "agent"

REVIEWER_ADMIN = "admin"
REVIEWER_MANAGER = "manager"

STATUS_PENDING = "pending"
STATUS_APPROVED = "approved"
STATUS_DECLINED = "declined"

LEAVE_TYPE_CASUAL = "casual"
LEAVE_TYPE_SICK = "sick"
LEAVE_TYPE_ANNUAL = "annual"
LEAVE_TYPE_UNPAID = "unpaid"
LEAVE_TYPE_OTHER = "other"

LEAVE_TYPES = (
    LEAVE_TYPE_CASUAL,
    LEAVE_TYPE_SICK,
    LEAVE_TYPE_ANNUAL,
    LEAVE_TYPE_UNPAID,
    LEAVE_TYPE_OTHER,
)

DURATION_FULL = "full_day"
DURATION_HALF = "half_day"

DURATION_TYPES = (DURATION_FULL, DURATION_HALF)


class LeaveRequest(Base):
    __tablename__ = "leave_request"

    id: Mapped[int] = mapped_column(primary_key=True)
    requester_type: Mapped[str] = mapped_column(String(20), index=True)
    requester_id: Mapped[int] = mapped_column(index=True)
    start_date: Mapped[date] = mapped_column(Date, index=True)
    end_date: Mapped[date] = mapped_column(Date, index=True)
    leave_type: Mapped[str] = mapped_column(String(20), default=LEAVE_TYPE_CASUAL, server_default=LEAVE_TYPE_CASUAL)
    duration_type: Mapped[str] = mapped_column(String(20), default=DURATION_FULL, server_default=DURATION_FULL)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default=STATUS_PENDING, server_default=STATUS_PENDING, index=True)
    calendar_days: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    working_days: Mapped[float] = mapped_column(Numeric(4, 1), default=0, server_default="0")
    weekend_days: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    assigned_reviewer_type: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    assigned_reviewer_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    reviewed_by_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_leave_request_requester", "requester_type", "requester_id"),
        Index("ix_leave_request_dates", "start_date", "end_date"),
        Index("ix_leave_request_assigned_reviewer", "assigned_reviewer_type", "assigned_reviewer_id"),
    )
