"""Finance, Payments, Invoices, and Expenses models."""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
import backend.app.auth.models  # noqa: F401


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Payment(Base):
    """Payment transaction record supporting UPI, Card, Cash settlements."""

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), default="UPI", nullable=False)  # UPI, CARD, CASH, NET_BANKING
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False, index=True)  # COMPLETED, PENDING, FAILED, REFUNDED
    reference_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # BOOKING, SHOP_ORDER, FOOD_ORDER, MEMBERSHIP
    reference_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    transaction_reference: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    # Relationships
    user: Mapped["backend.app.auth.models.User"] = relationship("User")


class Invoice(Base):
    """Customer billing invoice and email delivery record."""

    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_name: Mapped[str] = mapped_column(String(150), default="", nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), default="", nullable=False, index=True)

    transaction_type: Mapped[str] = mapped_column(String(50), default="GENERAL", nullable=False, index=True)  # MEMBERSHIP, SHOP, CAFETERIA, BOOKING, RENTAL
    reference_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True, index=True
    )

    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)  # final total amount
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PAID", nullable=False, index=True)  # PAID, PENDING, OVERDUE, CANCELLED

    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    pdf_path: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Email Delivery Tracking
    email_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)  # PENDING, SENT, FAILED
    email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    email_message_id: Mapped[str | None] = mapped_column(String(150), nullable=True)
    email_retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    email_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Idempotency and Itemized Breakdown
    idempotency_key: Mapped[str | None] = mapped_column(String(150), unique=True, nullable=True, index=True)
    items_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["backend.app.auth.models.User"] = relationship("User")
    payment: Mapped["Payment | None"] = relationship("Payment")


class Expense(Base):
    """Club operational expense record."""

    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # Maintenance, Utilities, Staff, Supplies, Equipment
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False, index=True)
    recorded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
