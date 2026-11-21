"""Members and Memberships API endpoints."""
import uuid
from datetime import date, timedelta
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import Role, User, UserRole
from backend.app.auth.security import hash_password
from backend.app.core.database import get_db
from backend.app.memberships.models import Member, MembershipPlan, MemberSubscription

router = APIRouter(prefix="", tags=["Members & Memberships"])


# Schemas
class MembershipPlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    price: Decimal
    duration_months: int
    court_discount_percent: float
    shop_discount_percent: float
    cafe_discount_percent: float
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class MemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    membership_number: str
    status: str
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    tier: Optional[str] = None
    joined_date: date
    expiry_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class MemberListResponse(BaseModel):
    items: List[MemberResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int


class SubscribePlanRequest(BaseModel):
    plan_id: uuid.UUID


class CreateMemberRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    plan_id: Optional[uuid.UUID] = None
    date_of_birth: Optional[date] = None


@router.get("/memberships/plans", response_model=List[MembershipPlanResponse])
def get_membership_plans(db: Session = Depends(get_db)):
    """List all available active membership tiers (Gold, Silver, Junior)."""
    plans = db.query(MembershipPlan).filter(MembershipPlan.is_active == True).all()
    return plans


@router.get("/members", response_model=MemberListResponse)
def list_members(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin / Staff: List members with search and status filters."""
    query = db.query(Member).join(User, Member.user_id == User.id)

    if status_filter:
        query = query.filter(Member.status == status_filter.upper())

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_pattern),
                User.last_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                Member.membership_number.ilike(search_pattern),
            )
        )

    total_count = query.count()
    offset = (page - 1) * page_size
    members = query.offset(offset).limit(page_size).all()

    items = []
    for m in members:
        tier_name = m.current_plan.name if m.current_plan else "None"
        items.append(
            MemberResponse(
                id=m.id,
                user_id=m.user_id,
                membership_number=m.membership_number,
                status=m.status,
                first_name=m.user.first_name,
                last_name=m.user.last_name,
                email=m.user.email,
                phone_number=m.user.phone_number,
                tier=tier_name,
                joined_date=m.joined_date,
                expiry_date=m.expiry_date,
            )
        )

    total_pages = max(1, (total_count + page_size - 1) // page_size)
    return MemberListResponse(
        items=items,
        total_count=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/members/me", response_model=MemberResponse)
def get_my_membership(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer: Retrieve own verified membership card and status."""
    member = db.query(Member).filter(Member.user_id == current_user.id).first()
    if not member:
        # Auto-create member card if not created yet
        mem_num = f"APX-MEM-{uuid.uuid4().hex[:6].upper()}"
        member = Member(
            user_id=current_user.id,
            membership_number=mem_num,
            status="ACTIVE",
        )
        db.add(member)
        db.commit()
        db.refresh(member)

    tier_name = member.current_plan.name if member.current_plan else "General Access"
    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        membership_number=member.membership_number,
        status=member.status,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        phone_number=current_user.phone_number,
        tier=tier_name,
        joined_date=member.joined_date,
        expiry_date=member.expiry_date,
    )


@router.post("/memberships/subscribe")
def subscribe_to_plan(
    payload: SubscribePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer: Subscribe or upgrade to a membership tier."""
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == payload.plan_id).first()
    if not plan or not plan.is_active:
        raise HTTPException(status_code=404, detail="Membership plan not found or inactive")

    member = db.query(Member).filter(Member.user_id == current_user.id).first()
    if not member:
        member = Member(
            user_id=current_user.id,
            membership_number=f"APX-MEM-{uuid.uuid4().hex[:6].upper()}",
            status="ACTIVE",
        )
        db.add(member)
        db.flush()

    today = date.today()
    member.current_plan_id = plan.id
    member.status = "ACTIVE"
    member.expiry_date = today + timedelta(days=plan.duration_months * 30)

    sub = MemberSubscription(
        member_id=member.id,
        plan_id=plan.id,
        start_date=today,
        end_date=member.expiry_date,
        amount_paid=plan.price,
        payment_status="PAID",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    invoice_number = None
    try:
        from backend.app.finance.invoice_service import create_or_get_invoice
        inv = create_or_get_invoice(
            db=db,
            user=current_user,
            transaction_type="MEMBERSHIP",
            amount=plan.price,
            items=[{
                "description": f"{plan.name} Tier Membership ({plan.duration_months} Months)",
                "quantity": 1,
                "unit_price": float(plan.price),
                "discount": 0.0,
                "tax": 0.0,
                "total": float(plan.price),
            }],
            reference_id=f"SUB-{str(sub.id)[:8].upper()}",
            membership_number=member.membership_number,
            idempotency_key=f"MEMBERSHIP:{sub.id}",
        )
        invoice_number = inv.invoice_number
    except Exception as e:
        import logging
        logging.getLogger("scms.members").error("Failed to generate membership invoice: %s", e)

    return {
        "message": f"Successfully subscribed to {plan.name}!",
        "plan": plan.name,
        "expiry_date": member.expiry_date.isoformat(),
        "invoice_number": invoice_number,
    }


@router.post("/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def create_member_admin(
    payload: CreateMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: Register a new member into the club."""
    clean_email = payload.email.strip().lower()
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        email=clean_email,
        hashed_password=hash_password("ApexMember@123"),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        phone_number=payload.phone_number,
        is_active=True,
        is_verified=True,
    )
    db.add(new_user)
    db.flush()

    cust_role = db.query(Role).filter(Role.name == "CUSTOMER").first()
    if cust_role:
        db.add(UserRole(user_id=new_user.id, role_id=cust_role.id))

    today = date.today()
    plan = None
    expiry = None
    if payload.plan_id:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == payload.plan_id).first()
        if plan:
            expiry = today + timedelta(days=plan.duration_months * 30)

    member = Member(
        user_id=new_user.id,
        membership_number=f"APX-MEM-{uuid.uuid4().hex[:6].upper()}",
        status="ACTIVE",
        date_of_birth=payload.date_of_birth,
        joined_date=today,
        expiry_date=expiry,
        current_plan_id=plan.id if plan else None,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        membership_number=member.membership_number,
        status=member.status,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        email=new_user.email,
        phone_number=new_user.phone_number,
        tier=plan.name if plan else "General Access",
        joined_date=member.joined_date,
        expiry_date=member.expiry_date,
    )
