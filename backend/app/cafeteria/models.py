"""Cafeteria, Menu, and Kitchen Live Order models."""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Cafeteria(Base):
    """Cafeteria commercial unit linked 1:1 to cafeteria owner user account."""

    __tablename__ = "cafeterias"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, INACTIVE
    opening_hours: Mapped[str | None] = mapped_column(String(100), default="07:00 AM - 10:00 PM", nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    user: Mapped["backend.app.auth.models.User"] = relationship("User")
    menu_items: Mapped[list["MenuItem"]] = relationship(
        "MenuItem", back_populates="cafeteria", cascade="all, delete-orphan"
    )
    orders: Mapped[list["FoodOrder"]] = relationship(
        "FoodOrder", back_populates="cafeteria", cascade="all, delete-orphan"
    )


class MenuItem(Base):
    """Food and beverage menu item."""

    __tablename__ = "menu_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cafeteria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cafeterias.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # Beverages, Snacks, Healthy Bowls, Post-Workout, Mains
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    preparation_time_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    cafeteria: Mapped["Cafeteria"] = relationship("Cafeteria", back_populates="menu_items")
    order_items: Mapped[list["FoodOrderItem"]] = relationship("FoodOrderItem", back_populates="menu_item")


class FoodOrder(Base):
    """Kitchen order placed by a member or customer."""

    __tablename__ = "food_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cafeteria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cafeterias.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # Lifecycle: NEW -> ACCEPTED -> PREPARING -> READY -> COMPLETED (or CANCELLED)
    status: Mapped[str] = mapped_column(String(30), default="NEW", nullable=False, index=True)
    order_type: Mapped[str] = mapped_column(String(20), default="DINE_IN", nullable=False)  # DINE_IN, PICKUP
    customer_notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_status: Mapped[str] = mapped_column(String(20), default="PAID", nullable=False)  # PAID, PENDING, REFUNDED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    cafeteria: Mapped["Cafeteria"] = relationship("Cafeteria", back_populates="orders")
    user: Mapped["backend.app.auth.models.User"] = relationship("User")
    items: Mapped[list["FoodOrderItem"]] = relationship(
        "FoodOrderItem", back_populates="order", cascade="all, delete-orphan"
    )


class FoodOrderItem(Base):
    """Line item within a kitchen food order."""

    __tablename__ = "food_order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("food_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    item_name: Mapped[str] = mapped_column(String(150), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    special_instructions: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    order: Mapped["FoodOrder"] = relationship("FoodOrder", back_populates="items")
    menu_item: Mapped["MenuItem"] = relationship("MenuItem", back_populates="order_items")
