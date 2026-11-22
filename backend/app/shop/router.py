"""Sports Shop, Vendor Portal, and Equipment Rental API endpoints."""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import User
from backend.app.auth.service import resolve_primary_role
from backend.app.core.database import get_db
from backend.app.shop.models import EquipmentRental, Product, ShopOrder, ShopOrderItem, Vendor

router = APIRouter(prefix="", tags=["Sports Shop & Vendor"])


# Schemas
class ProductResponse(BaseModel):
    id: uuid.UUID
    vendor_id: uuid.UUID
    name: str
    sku: str
    category: str
    price: Decimal
    cost_price: Optional[Decimal] = None
    stock_quantity: int
    low_stock_threshold: int
    is_active: bool
    is_rental: bool
    rental_price_per_day: Optional[Decimal] = None
    image_url: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CreateProductRequest(BaseModel):
    name: str
    category: str
    price: Decimal
    cost_price: Optional[Decimal] = None
    stock_quantity: int = 10
    low_stock_threshold: int = 5
    sku: Optional[str] = None
    is_rental: bool = False
    rental_price_per_day: Optional[Decimal] = None
    image_url: Optional[str] = None
    description: Optional[str] = None


class UpdateProductRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    is_active: Optional[bool] = None
    rental_price_per_day: Optional[Decimal] = None
    image_url: Optional[str] = None
    description: Optional[str] = None


class CartItemPayload(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(default=1, ge=1)


class CreateShopOrderRequest(BaseModel):
    items: List[CartItemPayload]
    fulfilment_type: str = "PICKUP"  # PICKUP, DELIVERY
    delivery_address: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal


class ShopOrderResponse(BaseModel):
    id: uuid.UUID
    vendor_id: uuid.UUID
    vendor_name: str
    order_number: str
    total_amount: Decimal
    status: str
    payment_status: str
    fulfilment_type: str
    delivery_address: Optional[str] = None
    created_at: datetime
    customer_name: str
    customer_email: str
    items: List[OrderItemResponse]
    invoice_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UpdateOrderStatusRequest(BaseModel):
    status: str  # PENDING, ACCEPTED, PROCESSING, READY_FOR_PICKUP, COMPLETED, CANCELLED


class CreateRentalRequest(BaseModel):
    product_id: uuid.UUID
    rental_start: datetime
    rental_end: datetime
    notes: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


class EquipmentRentalResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    user_name: str
    rental_start: datetime
    rental_end: datetime
    actual_return: Optional[datetime] = None
    rental_fee: Decimal
    status: str
    notes: Optional[str] = None
    invoice_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# --- Helper ---
def get_vendor_for_user(db: Session, user: User) -> Vendor:
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    if not vendor:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Authenticated user is not linked to a registered sports shop vendor.",
        )
    return vendor


# --- Public / Customer Catalog ---
@router.get("/shop/products", response_model=List[ProductResponse])
def get_shop_catalog(
    category: Optional[str] = None,
    is_rental: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Customer: Browse public sports shop and rental catalog."""
    query = db.query(Product).filter(Product.is_active == True)
    if category:
        query = query.filter(Product.category.ilike(category.strip()))
    if is_rental is not None:
        query = query.filter(Product.is_rental == is_rental)
    if search:
        patt = f"%{search.strip()}%"
        query = query.filter(or_(Product.name.ilike(patt), Product.description.ilike(patt)))
    return query.order_by(Product.created_at.desc(), Product.id.desc()).all()


# --- Vendor Scoped Endpoints ---
@router.get("/shop/vendor/products", response_model=List[ProductResponse])
def get_vendor_products(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vendor: View only products belonging to own vendor business."""
    vendor = get_vendor_for_user(db, current_user)
    return (
        db.query(Product)
        .filter(Product.vendor_id == vendor.id)
        .order_by(Product.created_at.desc(), Product.id.desc())
        .all()
    )


@router.post("/shop/vendor/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def add_vendor_product(
    payload: CreateProductRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vendor: Add a new product to shop inventory."""
    vendor = get_vendor_for_user(db, current_user)
    sku = payload.sku or f"SKU-{uuid.uuid4().hex[:8].upper()}"

    product = Product(
        vendor_id=vendor.id,
        name=payload.name.strip(),
        sku=sku,
        category=payload.category.strip(),
        price=payload.price,
        cost_price=payload.cost_price,
        stock_quantity=payload.stock_quantity,
        low_stock_threshold=payload.low_stock_threshold,
        is_rental=payload.is_rental,
        rental_price_per_day=payload.rental_price_per_day,
        image_url=payload.image_url,
        description=payload.description,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/shop/vendor/products/{product_id}", response_model=ProductResponse)
def update_vendor_product(
    product_id: uuid.UUID,
    payload: UpdateProductRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vendor: Update product information, price, or adjust inventory stock."""
    vendor = get_vendor_for_user(db, current_user)
    product = db.query(Product).filter(Product.id == product_id, Product.vendor_id == vendor.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found in your inventory.")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, val)

    db.commit()
    db.refresh(product)
    return product


@router.get("/shop/vendor/analytics")
def get_vendor_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vendor Dashboard: Key revenue, order volume, and low stock metrics."""
    vendor = get_vendor_for_user(db, current_user)

    total_products = db.query(func.count(Product.id)).filter(Product.vendor_id == vendor.id).scalar() or 0
    low_stock_count = (
        db.query(func.count(Product.id))
        .filter(Product.vendor_id == vendor.id, Product.stock_quantity <= Product.low_stock_threshold)
        .scalar()
        or 0
    )

    orders = db.query(ShopOrder).filter(ShopOrder.vendor_id == vendor.id).all()
    total_revenue = sum((o.total_amount for o in orders if o.status != "CANCELLED"), Decimal("0.00"))
    pending_orders = sum(1 for o in orders if o.status in ("PENDING", "ACCEPTED", "PROCESSING"))
    completed_orders = sum(1 for o in orders if o.status == "COMPLETED")

    active_rentals = (
        db.query(func.count(EquipmentRental.id))
        .join(Product, EquipmentRental.product_id == Product.id)
        .filter(Product.vendor_id == vendor.id, EquipmentRental.status == "ACTIVE")
        .scalar()
        or 0
    )

    return {
        "business_name": vendor.business_name,
        "total_revenue": total_revenue,
        "total_orders": len(orders),
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_products": total_products,
        "low_stock_products": low_stock_count,
        "active_rentals": active_rentals,
    }


# --- Orders Workflow ---
@router.post("/shop/orders", response_model=ShopOrderResponse, status_code=status.HTTP_201_CREATED)
def create_shop_order(
    payload: CreateShopOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer: Place a sports shop order and deduct stock quantities."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart cannot be empty")

    if payload.razorpay_order_id and payload.razorpay_payment_id and payload.razorpay_signature:
        from backend.app.finance.razorpay_service import verify_payment_signature
        if not verify_payment_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid Razorpay cryptographic signature.")

    vendor_id = None
    total_amount = Decimal("0.00")
    order_items_to_create = []

    for item in payload.items:
        prod = (
            db.query(Product)
            .filter(Product.id == item.product_id, Product.is_active == True)
            .with_for_update()
            .populate_existing()
            .first()
        )
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not available")
        if vendor_id is None:
            vendor_id = prod.vendor_id
        if prod.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{prod.name}'. Only {prod.stock_quantity} remaining.",
            )

        line_total = prod.price * Decimal(item.quantity)
        total_amount += line_total
        prod.stock_quantity -= item.quantity  # Deduct stock

        order_items_to_create.append((prod, item.quantity, prod.price, line_total))

    order_num = f"ORD-SHP-{uuid.uuid4().hex[:6].upper()}"
    order = ShopOrder(
        vendor_id=vendor_id,
        user_id=current_user.id,
        order_number=order_num,
        total_amount=total_amount,
        status="PENDING",
        payment_status="PAID",
        fulfilment_type=payload.fulfilment_type,
        delivery_address=payload.delivery_address,
    )
    db.add(order)
    db.flush()

    response_items = []
    for prod, qty, u_price, l_total in order_items_to_create:
        oi = ShopOrderItem(
            order_id=order.id,
            product_id=prod.id,
            quantity=qty,
            unit_price=u_price,
            total_price=l_total,
        )
        db.add(oi)
        db.flush()
        response_items.append(
            OrderItemResponse(
                id=oi.id,
                product_id=prod.id,
                product_name=prod.name,
                quantity=qty,
                unit_price=u_price,
                total_price=l_total,
            )
        )

    db.commit()
    db.refresh(order)

    invoice_number = None
    try:
        from backend.app.finance.invoice_service import create_or_get_invoice
        from backend.app.memberships.models import Member
        member = db.query(Member).filter(Member.user_id == current_user.id).first()
        items_payload = [
            {
                "description": f"{prod.name} (SKU: {str(prod.id)[:8].upper()})",
                "quantity": qty,
                "unit_price": float(u_price),
                "discount": 0.0,
                "tax": 0.0,
                "total": float(l_total),
            }
            for prod, qty, u_price, l_total in order_items_to_create
        ]
        inv = create_or_get_invoice(
            db=db,
            user=current_user,
            transaction_type="SHOP",
            amount=order.total_amount,
            items=items_payload,
            reference_id=order.order_number,
            membership_number=member.membership_number if member else None,
            idempotency_key=f"SHOP_ORDER:{order.id}",
            payment_method="RAZORPAY" if payload.razorpay_payment_id else "UPI",
            payment_reference=payload.razorpay_payment_id,
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_signature=payload.razorpay_signature,
        )
        invoice_number = inv.invoice_number
    except Exception as e:
        import logging
        logging.getLogger("scms.shop").error("Failed to generate shop invoice: %s", e)

    return ShopOrderResponse(
        id=order.id,
        vendor_id=order.vendor_id,
        vendor_name=order.vendor.business_name,
        order_number=order.order_number,
        total_amount=order.total_amount,
        status=order.status,
        payment_status=order.payment_status,
        fulfilment_type=order.fulfilment_type,
        delivery_address=order.delivery_address,
        created_at=order.created_at,
        customer_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        customer_email=current_user.email,
        items=response_items,
        invoice_number=invoice_number,
    )


@router.get("/shop/orders", response_model=List[ShopOrderResponse])
def list_shop_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List orders: Vendors see only their shop orders; Customers see their orders; Admins see all."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    query = db.query(ShopOrder)
    if primary_role == "SPORTS_SHOP_VENDOR":
        vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
        if not vendor:
            return []
        query = query.filter(ShopOrder.vendor_id == vendor.id)
    elif primary_role == "CUSTOMER":
        query = query.filter(ShopOrder.user_id == current_user.id)

    orders = query.order_by(ShopOrder.created_at.desc(), ShopOrder.id.desc()).limit(100).all()

    result = []
    for o in orders:
        items = [
            OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
            )
            for item in o.items
        ]
        result.append(
            ShopOrderResponse(
                id=o.id,
                vendor_id=o.vendor_id,
                vendor_name=o.vendor.business_name if o.vendor else "Apex Pro Shop",
                order_number=o.order_number,
                total_amount=o.total_amount,
                status=o.status,
                payment_status=o.payment_status,
                fulfilment_type=o.fulfilment_type,
                delivery_address=o.delivery_address,
                created_at=o.created_at,
                customer_name=f"{o.user.first_name} {o.user.last_name}".strip(),
                customer_email=o.user.email,
                items=items,
            )
        )
    return result


@router.patch("/shop/orders/{order_id}/status")
def update_shop_order_status(
    order_id: uuid.UUID,
    payload: UpdateOrderStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vendor / Admin: Advance order lifecycle (PENDING -> ACCEPTED -> PROCESSING -> READY_FOR_PICKUP -> COMPLETED)."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    order = db.query(ShopOrder).filter(ShopOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if primary_role == "SPORTS_SHOP_VENDOR":
        vendor = get_vendor_for_user(db, current_user)
        if order.vendor_id != vendor.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this order.")

    order.status = payload.status.upper()
    db.commit()
    return {"message": f"Order status updated to {order.status}", "order_id": str(order_id)}


# --- Equipment Rentals ---
@router.post("/shop/rentals", response_model=EquipmentRentalResponse, status_code=status.HTTP_201_CREATED)
def book_equipment_rental(
    payload: CreateRentalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer: Reserve rental sports equipment."""
    prod = db.query(Product).filter(Product.id == payload.product_id, Product.is_rental == True).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Rental item not found or not available for rent.")

    if payload.razorpay_order_id and payload.razorpay_payment_id and payload.razorpay_signature:
        from backend.app.finance.razorpay_service import verify_payment_signature
        if not verify_payment_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid Razorpay cryptographic signature.")

    duration_days = max(1, (payload.rental_end - payload.rental_start).days)
    daily_rate = prod.rental_price_per_day or Decimal("300.00")
    rental_fee = daily_rate * Decimal(duration_days)

    rental = EquipmentRental(
        product_id=prod.id,
        user_id=current_user.id,
        rental_start=payload.rental_start,
        rental_end=payload.rental_end,
        rental_fee=rental_fee,
        status="ACTIVE",
        notes=payload.notes,
    )
    db.add(rental)
    db.commit()
    db.refresh(rental)

    invoice_number = None
    try:
        from backend.app.finance.invoice_service import create_or_get_invoice
        from backend.app.memberships.models import Member
        member = db.query(Member).filter(Member.user_id == current_user.id).first()
        start_str = payload.rental_start.strftime("%Y-%m-%d")
        end_str = payload.rental_end.strftime("%Y-%m-%d")
        inv = create_or_get_invoice(
            db=db,
            user=current_user,
            transaction_type="RENTAL",
            amount=rental.rental_fee,
            items=[{
                "description": f"Rental: {prod.name} ({duration_days} day(s): {start_str} to {end_str})",
                "quantity": duration_days,
                "unit_price": float(daily_rate),
                "discount": 0.0,
                "tax": 0.0,
                "total": float(rental.rental_fee),
            }],
            reference_id=f"RNT-{str(rental.id)[:8].upper()}",
            membership_number=member.membership_number if member else None,
            idempotency_key=f"RENTAL:{rental.id}",
            payment_method="RAZORPAY" if payload.razorpay_payment_id else "UPI",
            payment_reference=payload.razorpay_payment_id,
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_signature=payload.razorpay_signature,
        )
        invoice_number = inv.invoice_number
    except Exception as e:
        import logging
        logging.getLogger("scms.shop").error("Failed to generate rental invoice: %s", e)

    return EquipmentRentalResponse(
        id=rental.id,
        product_id=prod.id,
        product_name=prod.name,
        user_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        rental_start=rental.rental_start,
        rental_end=rental.rental_end,
        actual_return=rental.actual_return,
        rental_fee=rental.rental_fee,
        status=rental.status,
        notes=rental.notes,
        invoice_number=invoice_number,
    )


@router.get("/shop/rentals", response_model=List[EquipmentRentalResponse])
def list_equipment_rentals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List equipment rentals."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    query = db.query(EquipmentRental).join(Product, EquipmentRental.product_id == Product.id).join(User, EquipmentRental.user_id == User.id)
    if primary_role == "CUSTOMER":
        query = query.filter(EquipmentRental.user_id == current_user.id)
    elif primary_role == "SPORTS_SHOP_VENDOR":
        vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
        if vendor:
            query = query.filter(Product.vendor_id == vendor.id)

    rentals = query.order_by(EquipmentRental.created_at.desc(), EquipmentRental.id.desc()).all()
    return [
        EquipmentRentalResponse(
            id=r.id,
            product_id=r.product_id,
            product_name=r.product.name,
            user_name=f"{r.user.first_name} {r.user.last_name}".strip(),
            rental_start=r.rental_start,
            rental_end=r.rental_end,
            actual_return=r.actual_return,
            rental_fee=r.rental_fee,
            status=r.status,
            notes=r.notes,
        )
        for r in rentals
    ]


@router.patch("/shop/rentals/{rental_id}/return", response_model=EquipmentRentalResponse)
def return_equipment_rental(
    rental_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vendor/Admin: Record return of sports rental equipment."""
    rental = db.query(EquipmentRental).filter(EquipmentRental.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=404, detail="Rental record not found")

    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)
    if primary_role not in ("ADMIN", "SPORTS_SHOP_VENDOR"):
        raise HTTPException(status_code=403, detail="Not authorized to process rental returns")

    rental.actual_return = datetime.now(timezone.utc)
    rental.status = "RETURNED"

    # Restock the rented product
    product = db.query(Product).filter(Product.id == rental.product_id).first()
    if product:
        product.stock_quantity += 1

    db.commit()
    db.refresh(rental)

    return EquipmentRentalResponse(
        id=rental.id,
        product_id=rental.product_id,
        product_name=rental.product.name,
        user_name=f"{rental.user.first_name} {rental.user.last_name}".strip(),
        rental_start=rental.rental_start,
        rental_end=rental.rental_end,
        actual_return=rental.actual_return,
        rental_fee=rental.rental_fee,
        status=rental.status,
        notes=rental.notes,
    )

