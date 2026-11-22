"""Vendor, Sports Shop, and Equipment Rental models."""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Vendor(Base):
    """Vendor business entity linked 1:1 to a vendor user account."""

    __tablename__ = "vendors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    business_name: Mapped[str] = mapped_column(String(150), nullable=False)
    vendor_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # SPORTS_SHOP, CAFETERIA
    status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False, index=True)  # PENDING_APPROVAL, APPROVED, SUSPENDED
    contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    user: Mapped["backend.app.auth.models.User"] = relationship("User")
    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="vendor", cascade="all, delete-orphan"
    )
    orders: Mapped[list["ShopOrder"]] = relationship(
        "ShopOrder", back_populates="vendor", cascade="all, delete-orphan"
    )


class Product(Base):
    """Sports shop product entity."""

    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # Rackets, Balls, Shoes, Apparel, Accessories, Equipment
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    cost_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_rental: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    rental_price_per_day: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="products")
    order_items: Mapped[list["ShopOrderItem"]] = relationship("ShopOrderItem", back_populates="product")
    rentals: Mapped[list["EquipmentRental"]] = relationship("EquipmentRental", back_populates="product")

    __table_args__ = (
        CheckConstraint("stock_quantity >= 0", name="chk_products_stock_non_negative"),
    )


class EquipmentRental(Base):
    """Equipment rental booking and condition tracking."""

    __tablename__ = "equipment_rentals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rental_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    rental_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_return: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rental_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, RETURNED, OVERDUE
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="rentals")
    user: Mapped["backend.app.auth.models.User"] = relationship("User")


class ShopOrder(Base):
    """Order placed at a sports shop vendor."""

    __tablename__ = "shop_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)  # PENDING, ACCEPTED, PROCESSING, READY_FOR_PICKUP, COMPLETED, CANCELLED
    payment_status: Mapped[str] = mapped_column(String(20), default="PAID", nullable=False)  # PAID, PENDING, REFUNDED
    fulfilment_type: Mapped[str] = mapped_column(String(20), default="PICKUP", nullable=False)  # PICKUP, DELIVERY
    delivery_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="orders")
    user: Mapped["backend.app.auth.models.User"] = relationship("User")
    items: Mapped[list["ShopOrderItem"]] = relationship(
        "ShopOrderItem", back_populates="order", cascade="all, delete-orphan"
    )


class ShopOrderItem(Base):
    """Line item in a shop order."""

    __tablename__ = "shop_order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shop_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Relationships
    order: Mapped["ShopOrder"] = relationship("ShopOrder", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="order_items")
