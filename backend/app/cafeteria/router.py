"""Cafeteria, Kitchen Order Board, and Menu API endpoints."""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import User
from backend.app.auth.service import resolve_primary_role
from backend.app.core.database import get_db
from backend.app.cafeteria.models import Cafeteria, FoodOrder, FoodOrderItem, MenuItem

router = APIRouter(prefix="", tags=["Cafeteria & Live Orders"])


# Schemas
class MenuItemResponse(BaseModel):
    id: uuid.UUID
    cafeteria_id: uuid.UUID
    name: str
    category: str
    price: Decimal
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool
    preparation_time_minutes: int
    calories: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CreateMenuItemRequest(BaseModel):
    name: str
    category: str
    price: Decimal
    description: Optional[str] = None
    image_url: Optional[str] = None
    preparation_time_minutes: int = 15
    calories: Optional[int] = None
    is_available: bool = True


class UpdateMenuItemRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[Decimal] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    preparation_time_minutes: Optional[int] = None


class FoodOrderItemPayload(BaseModel):
    menu_item_id: uuid.UUID
    quantity: int = Field(default=1, ge=1)
    special_instructions: Optional[str] = None


class CreateFoodOrderRequest(BaseModel):
    items: List[FoodOrderItemPayload]
    order_type: str = "DINE_IN"  # DINE_IN, PICKUP
    customer_notes: Optional[str] = None


class FoodOrderItemResponse(BaseModel):
    id: uuid.UUID
    menu_item_id: uuid.UUID
    item_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    special_instructions: Optional[str] = None


class FoodOrderResponse(BaseModel):
    id: uuid.UUID
    cafeteria_id: uuid.UUID
    order_number: str
    total_amount: Decimal
    status: str  # NEW, ACCEPTED, PREPARING, READY, COMPLETED, CANCELLED
    order_type: str
    customer_notes: Optional[str] = None
    payment_status: str
    created_at: datetime
    customer_name: str
    items: List[FoodOrderItemResponse]
    invoice_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UpdateFoodOrderStatusRequest(BaseModel):
    status: str  # NEW, ACCEPTED, PREPARING, READY, COMPLETED, CANCELLED


# --- Helper ---
def get_cafeteria_for_user(db: Session, user: User) -> Cafeteria:
    cafe = db.query(Cafeteria).filter(Cafeteria.user_id == user.id).first()
    if not cafe:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Authenticated user is not linked to a cafeteria owner profile.",
        )
    return cafe


# --- Public / Customer Menu ---
@router.get("/cafeteria/menu", response_model=List[MenuItemResponse])
def get_cafeteria_menu(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Customer: Browse cafeteria food and beverage menu."""
    query = db.query(MenuItem).filter(MenuItem.is_available == True)
    if category:
        query = query.filter(MenuItem.category.ilike(category.strip()))
    return query.order_by(MenuItem.created_at.desc(), MenuItem.id.desc()).all()


# --- Cafeteria Owner Menu Management ---
@router.get("/cafeteria/owner/menu", response_model=List[MenuItemResponse])
def get_owner_menu(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cafeteria Owner: View all menu items including sold-out items."""
    cafe = get_cafeteria_for_user(db, current_user)
    return (
        db.query(MenuItem)
        .filter(MenuItem.cafeteria_id == cafe.id)
        .order_by(MenuItem.created_at.desc(), MenuItem.id.desc())
        .all()
    )


@router.post("/cafeteria/owner/menu", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
def add_menu_item(
    payload: CreateMenuItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cafeteria Owner: Add new culinary or beverage item to menu."""
    cafe = get_cafeteria_for_user(db, current_user)

    item = MenuItem(
        cafeteria_id=cafe.id,
        name=payload.name.strip(),
        category=payload.category.strip(),
        price=payload.price,
        description=payload.description,
        image_url=payload.image_url,
        preparation_time_minutes=payload.preparation_time_minutes,
        calories=payload.calories,
        is_available=payload.is_available,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/cafeteria/owner/menu/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    item_id: uuid.UUID,
    payload: UpdateMenuItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cafeteria Owner: Update menu item price or toggle sold out status."""
    cafe = get_cafeteria_for_user(db, current_user)
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.cafeteria_id == cafe.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found in your cafeteria.")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, val)

    db.commit()
    db.refresh(item)
    return item


# --- Cafeteria Analytics ---
@router.get("/cafeteria/owner/analytics")
def get_cafeteria_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cafeteria Owner Dashboard: Live orders count, revenue today, and order distribution."""
    cafe = get_cafeteria_for_user(db, current_user)

    all_orders = db.query(FoodOrder).filter(FoodOrder.cafeteria_id == cafe.id).all()
    today_orders = [o for o in all_orders if o.created_at.date() == date.today()]

    revenue_today = sum((o.total_amount for o in today_orders if o.status != "CANCELLED"), Decimal("0.00"))
    total_revenue = sum((o.total_amount for o in all_orders if o.status != "CANCELLED"), Decimal("0.00"))

    stage_counts = {
        "NEW": sum(1 for o in all_orders if o.status == "NEW"),
        "ACCEPTED": sum(1 for o in all_orders if o.status == "ACCEPTED"),
        "PREPARING": sum(1 for o in all_orders if o.status == "PREPARING"),
        "READY": sum(1 for o in all_orders if o.status == "READY"),
        "COMPLETED": sum(1 for o in all_orders if o.status == "COMPLETED"),
    }

    return {
        "cafeteria_name": cafe.name,
        "revenue_today": revenue_today,
        "total_revenue": total_revenue,
        "orders_today_count": len(today_orders),
        "total_orders_count": len(all_orders),
        "stage_counts": stage_counts,
    }


# --- Orders Workflow & Live Kitchen Board ---
@router.post("/cafeteria/orders", response_model=FoodOrderResponse, status_code=status.HTTP_201_CREATED)
def create_food_order(
    payload: CreateFoodOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer: Place a kitchen order."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    first_item = db.query(MenuItem).filter(MenuItem.id == payload.items[0].menu_item_id).first()
    if not first_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    cafeteria_id = first_item.cafeteria_id
    total_amount = Decimal("0.00")
    order_items_to_create = []

    for it in payload.items:
        m_item = db.query(MenuItem).filter(MenuItem.id == it.menu_item_id, MenuItem.is_available == True).first()
        if not m_item:
            raise HTTPException(status_code=404, detail=f"Menu item {it.menu_item_id} is unavailable or sold out.")

        line_total = m_item.price * Decimal(it.quantity)
        total_amount += line_total
        order_items_to_create.append((m_item, it.quantity, m_item.price, line_total, it.special_instructions))

    order_num = f"ORD-CAF-{uuid.uuid4().hex[:6].upper()}"
    order = FoodOrder(
        cafeteria_id=cafeteria_id,
        user_id=current_user.id,
        order_number=order_num,
        total_amount=total_amount,
        status="NEW",
        order_type=payload.order_type,
        customer_notes=payload.customer_notes,
        payment_status="PAID",
    )
    db.add(order)
    db.flush()

    response_items = []
    for m_item, qty, u_price, l_total, notes in order_items_to_create:
        foi = FoodOrderItem(
            order_id=order.id,
            menu_item_id=m_item.id,
            item_name=m_item.name,
            quantity=qty,
            unit_price=u_price,
            total_price=l_total,
            special_instructions=notes,
        )
        db.add(foi)
        db.flush()
        response_items.append(
            FoodOrderItemResponse(
                id=foi.id,
                menu_item_id=m_item.id,
                item_name=m_item.name,
                quantity=qty,
                unit_price=u_price,
                total_price=l_total,
                special_instructions=notes,
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
                "description": m_item.name + (f" ({notes})" if notes else ""),
                "quantity": qty,
                "unit_price": float(u_price),
                "discount": 0.0,
                "tax": 0.0,
                "total": float(l_total),
            }
            for m_item, qty, u_price, l_total, notes in order_items_to_create
        ]
        inv = create_or_get_invoice(
            db=db,
            user=current_user,
            transaction_type="CAFETERIA",
            amount=order.total_amount,
            items=items_payload,
            reference_id=order.order_number,
            membership_number=member.membership_number if member else None,
            idempotency_key=f"FOOD_ORDER:{order.id}",
        )
        invoice_number = inv.invoice_number
    except Exception as e:
        import logging
        logging.getLogger("scms.cafeteria").error("Failed to generate food order invoice: %s", e)

    return FoodOrderResponse(
        id=order.id,
        cafeteria_id=order.cafeteria_id,
        order_number=order.order_number,
        total_amount=order.total_amount,
        status=order.status,
        order_type=order.order_type,
        customer_notes=order.customer_notes,
        payment_status=order.payment_status,
        created_at=order.created_at,
        customer_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        items=response_items,
        invoice_number=invoice_number,
    )


@router.get("/cafeteria/orders", response_model=List[FoodOrderResponse])
def list_cafeteria_orders(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Live Kitchen Board: Cafeteria owners see their live orders; Customers see their orders; Admins see all."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    query = db.query(FoodOrder)
    if primary_role == "CAFETERIA_OWNER":
        cafe = db.query(Cafeteria).filter(Cafeteria.user_id == current_user.id).first()
        if not cafe:
            return []
        query = query.filter(FoodOrder.cafeteria_id == cafe.id)
    elif primary_role == "CUSTOMER":
        query = query.filter(FoodOrder.user_id == current_user.id)

    if status_filter:
        query = query.filter(FoodOrder.status == status_filter.upper())

    orders = query.order_by(FoodOrder.created_at.desc(), FoodOrder.id.desc()).limit(100).all()

    result = []
    for o in orders:
        items = [
            FoodOrderItemResponse(
                id=it.id,
                menu_item_id=it.menu_item_id,
                item_name=it.item_name,
                quantity=it.quantity,
                unit_price=it.unit_price,
                total_price=it.total_price,
                special_instructions=it.special_instructions,
            )
            for it in o.items
        ]
        result.append(
            FoodOrderResponse(
                id=o.id,
                cafeteria_id=o.cafeteria_id,
                order_number=o.order_number,
                total_amount=o.total_amount,
                status=o.status,
                order_type=o.order_type,
                customer_notes=o.customer_notes,
                payment_status=o.payment_status,
                created_at=o.created_at,
                customer_name=f"{o.user.first_name} {o.user.last_name}".strip(),
                items=items,
            )
        )
    return result


@router.patch("/cafeteria/orders/{order_id}/status")
def update_food_order_status(
    order_id: uuid.UUID,
    payload: UpdateFoodOrderStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Kitchen Board: Advance order stage (NEW -> ACCEPTED -> PREPARING -> READY -> COMPLETED)."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    order = db.query(FoodOrder).filter(FoodOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if primary_role == "CAFETERIA_OWNER":
        cafe = get_cafeteria_for_user(db, current_user)
        if order.cafeteria_id != cafe.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this cafeteria order.")

    order.status = payload.status.upper()
    db.commit()
    return {"message": f"Order advanced to {order.status}", "order_id": str(order_id), "status": order.status}
