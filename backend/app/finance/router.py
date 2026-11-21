"""Finance, Admin Overview, and Vendor Administration API endpoints."""
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import Role, User, UserRole
from backend.app.auth.service import resolve_primary_role
from backend.app.core.database import get_db
from backend.app.memberships.models import Member, MemberSubscription
from backend.app.bookings.models import Court, CourtBooking
from backend.app.shop.models import Product, ShopOrder, Vendor
from backend.app.cafeteria.models import Cafeteria, FoodOrder
from backend.app.finance.models import Expense, Invoice, Payment

router = APIRouter(prefix="", tags=["Finance & Admin Management"])


class AdminOverviewMetrics(BaseModel):
    total_members: int
    active_memberships: int
    expiring_memberships: int
    todays_bookings_count: int
    court_occupancy_percent: float
    revenue_today: Decimal
    revenue_this_month: Decimal
    court_revenue_today: Decimal
    shop_revenue_today: Decimal
    cafeteria_revenue_today: Decimal
    membership_revenue_this_month: Decimal
    pending_orders_count: int
    pending_vendor_approvals_count: int


class VendorAdminResponse(BaseModel):
    id: uuid.UUID
    business_name: str
    vendor_type: str
    status: str
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    owner_name: str
    owner_email: str
    products_count: int
    orders_count: int
    total_revenue: Decimal

    model_config = ConfigDict(from_attributes=True)


class UpdateVendorStatusRequest(BaseModel):
    status: str  # APPROVED, SUSPENDED, PENDING_APPROVAL


class PaymentResponse(BaseModel):
    id: uuid.UUID
    user_name: str
    amount: Decimal
    payment_method: str
    status: str
    reference_type: str
    reference_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("/admin/overview", response_model=AdminOverviewMetrics)
def get_admin_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin Dashboard: Real-time club metrics from live PostgreSQL database."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required.")

    today = date.today()
    month_start = today.replace(day=1)

    # 1. Members
    total_members = db.query(func.count(Member.id)).scalar() or 0
    active_memberships = db.query(func.count(Member.id)).filter(Member.status == "ACTIVE").scalar() or 0
    expiring_memberships = (
        db.query(func.count(Member.id))
        .filter(
            Member.status == "ACTIVE",
            Member.expiry_date != None,
            Member.expiry_date <= today + timedelta(days=30),
        )
        .scalar()
        or 0
    )

    # 2. Today's Bookings & Occupancy
    todays_bookings = db.query(CourtBooking).filter(CourtBooking.booking_date == today, CourtBooking.status != "CANCELLED").all()
    todays_bookings_count = len(todays_bookings)
    court_revenue_today = sum((b.total_amount for b in todays_bookings), Decimal("0.00"))

    total_courts = db.query(func.count(Court.id)).filter(Court.is_active == True).scalar() or 1
    # 17 hours per court per day (06:00 to 23:00)
    total_capacity_slots = total_courts * 17
    court_occupancy = round((todays_bookings_count / max(1, total_capacity_slots)) * 100.0, 1)

    # 3. Shop Revenue Today
    shop_orders_today = (
        db.query(ShopOrder)
        .filter(func.date(ShopOrder.created_at) == today, ShopOrder.status != "CANCELLED")
        .all()
    )
    shop_revenue_today = sum((o.total_amount for o in shop_orders_today), Decimal("0.00"))

    # 4. Cafeteria Revenue Today
    food_orders_today = (
        db.query(FoodOrder)
        .filter(func.date(FoodOrder.created_at) == today, FoodOrder.status != "CANCELLED")
        .all()
    )
    cafeteria_revenue_today = sum((o.total_amount for o in food_orders_today), Decimal("0.00"))

    # 5. Memberships Revenue this month
    subs_month = (
        db.query(MemberSubscription)
        .filter(MemberSubscription.start_date >= month_start, MemberSubscription.payment_status == "PAID")
        .all()
    )
    membership_revenue_this_month = sum((s.amount_paid for s in subs_month), Decimal("0.00"))

    revenue_today = court_revenue_today + shop_revenue_today + cafeteria_revenue_today
    revenue_this_month = revenue_today + membership_revenue_this_month

    # 6. Pending Counts
    pending_shop = db.query(func.count(ShopOrder.id)).filter(ShopOrder.status == "PENDING").scalar() or 0
    pending_food = db.query(func.count(FoodOrder.id)).filter(FoodOrder.status == "NEW").scalar() or 0
    pending_vendor_approvals = db.query(func.count(Vendor.id)).filter(Vendor.status == "PENDING_APPROVAL").scalar() or 0

    return AdminOverviewMetrics(
        total_members=total_members,
        active_memberships=active_memberships,
        expiring_memberships=expiring_memberships,
        todays_bookings_count=todays_bookings_count,
        court_occupancy_percent=court_occupancy,
        revenue_today=revenue_today,
        revenue_this_month=revenue_this_month,
        court_revenue_today=court_revenue_today,
        shop_revenue_today=shop_revenue_today,
        cafeteria_revenue_today=cafeteria_revenue_today,
        membership_revenue_this_month=membership_revenue_this_month,
        pending_orders_count=pending_shop + pending_food,
        pending_vendor_approvals_count=pending_vendor_approvals,
    )


@router.get("/admin/vendors", response_model=List[VendorAdminResponse])
def list_vendors_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: Overview of all sports shop vendors and cafeteria owners."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    vendors = db.query(Vendor).all()
    res = []
    for v in vendors:
        p_count = len(v.products)
        o_count = len(v.orders)
        rev = sum((o.total_amount for o in v.orders if o.status != "CANCELLED"), Decimal("0.00"))
        res.append(
            VendorAdminResponse(
                id=v.id,
                business_name=v.business_name,
                vendor_type=v.vendor_type,
                status=v.status,
                contact_phone=v.contact_phone,
                contact_email=v.contact_email,
                owner_name=f"{v.user.first_name} {v.user.last_name}".strip(),
                owner_email=v.user.email,
                products_count=p_count,
                orders_count=o_count,
                total_revenue=rev,
            )
        )
    return res


@router.patch("/admin/vendors/{vendor_id}/status")
def update_vendor_status(
    vendor_id: uuid.UUID,
    payload: UpdateVendorStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: Approve, activate, or suspend a vendor."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor.status = payload.status.upper()
    db.commit()
    return {"message": f"Vendor status set to {vendor.status}", "vendor_id": str(vendor_id)}


@router.get("/finance/transactions", response_model=List[PaymentResponse])
def list_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin / Member: List payment settlements."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    query = db.query(Payment)
    if primary_role != "ADMIN":
        query = query.filter(Payment.user_id == current_user.id)

    payments = query.order_by(Payment.created_at.desc()).limit(100).all()
    return [
        PaymentResponse(
            id=p.id,
            user_name=f"{p.user.first_name} {p.user.last_name}".strip(),
            amount=p.amount,
            payment_method=p.payment_method,
            status=p.status,
            reference_type=p.reference_type,
            reference_id=p.reference_id,
            created_at=p.created_at,
        )
        for p in payments
    ]
