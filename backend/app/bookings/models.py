"""Courts and Facility Booking models."""
import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Court(Base):
    """Playing facility or court representation (Padel, Tennis, Cricket, etc.)."""

    __tablename__ = "courts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sport: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # padel, tennis, badminton, cricket, football, table_tennis, golf, swimming
    surface_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # synthetic turf, clay, acrylic, wooden, grass
    hourly_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_indoor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    opening_time: Mapped[time] = mapped_column(Time, default=time(6, 0), nullable=False)
    closing_time: Mapped[time] = mapped_column(Time, default=time(23, 0), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    bookings: Mapped[list["CourtBooking"]] = relationship(
        "CourtBooking", back_populates="court", cascade="all, delete-orphan"
    )
    holds: Mapped[list["CourtHold"]] = relationship(
        "CourtHold", back_populates="court", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_courts_sport_active", "sport", "is_active"),
    )


class CourtBooking(Base):
    """Court reservation record enforcing non-overlapping slots and membership constraints."""

    __tablename__ = "court_bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    court_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    member_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    booking_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    hourly_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="CONFIRMED", nullable=False, index=True)  # CONFIRMED, CANCELLED, COMPLETED
    participant_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    court: Mapped["Court"] = relationship("Court", back_populates="bookings")
    user: Mapped["backend.app.auth.models.User"] = relationship("User")
    member: Mapped["backend.app.memberships.models.Member | None"] = relationship("Member")

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="chk_booking_end_after_start"),
        Index("ix_court_bookings_court_times", "court_id", "booking_date", "start_time", "end_time", "status"),
        Index("ix_court_bookings_user_daily", "user_id", "booking_date", "status"),
    )


class CourtHold(Base):
    """Temporary reservation hold locking a court/slot for 5 minutes while user is confirming."""

    __tablename__ = "court_holds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    court_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    booking_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    client_session_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    court: Mapped["Court"] = relationship("Court", back_populates="holds")
    user: Mapped["backend.app.auth.models.User"] = relationship("User")

    __table_args__ = (
        Index("ix_court_holds_slot_lookup", "court_id", "booking_date", "start_time", "is_active", "expires_at"),
    )

