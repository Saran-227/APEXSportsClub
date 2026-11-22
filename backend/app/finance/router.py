"""Finance, Admin Overview, and Vendor Administration API endpoints."""
import json
from pathlib import Path
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, or_
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
from backend.app.core.config import get_settings
from backend.app.finance.email_service import (
    send_diagnostic_test_email,
    validate_sendgrid_key_format,
)
from backend.app.finance.schemas import (
    EmailDiagnosticStatusResponse,
    EmailDiagnosticTestRequest,
    EmailDiagnosticTestResponse,
    InvoiceItemSchema,
    InvoiceMetricsResponse,
    InvoiceResponse,
    ResendInvoiceEmailResponse,
)
from backend.app.finance.invoice_service import (
    generate_invoice_pdf,
    get_invoice_storage_dir,
    resend_invoice_email,
)

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

    vendors = db.query(Vendor).order_by(Vendor.created_at.desc(), Vendor.id.desc()).all()
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

    payments = query.order_by(Payment.created_at.desc(), Payment.id.desc()).limit(100).all()
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


def _serialize_invoice(inv: Invoice) -> InvoiceResponse:
    """Helper serializer from Invoice model to InvoiceResponse DTO."""
    items_list = []
    if inv.items_json:
        try:
            raw = json.loads(inv.items_json)
            for it in raw:
                items_list.append(
                    InvoiceItemSchema(
                        description=it.get("description", "Item"),
                        quantity=it.get("quantity", 1),
                        unit_price=Decimal(str(it.get("unit_price", 0))),
                        discount=Decimal(str(it.get("discount", 0))),
                        tax=Decimal(str(it.get("tax", 0))),
                        total=Decimal(str(it.get("total", 0))),
                    )
                )
        except Exception:
            pass

    has_pdf = bool(inv.pdf_path and Path(inv.pdf_path).exists())
    cust_name = inv.customer_name
    if not cust_name and inv.user:
        cust_name = f"{inv.user.first_name} {inv.user.last_name}".strip()

    cust_email = inv.customer_email
    if not cust_email and inv.user:
        cust_email = inv.user.email

    return InvoiceResponse(
        id=inv.id,
        invoice_number=inv.invoice_number,
        user_id=inv.user_id,
        customer_name=cust_name or "Member",
        customer_email=cust_email or "",
        transaction_type=inv.transaction_type,
        reference_id=inv.reference_id,
        payment_id=inv.payment_id,
        subtotal=inv.subtotal,
        discount_amount=inv.discount_amount,
        tax_amount=inv.tax_amount,
        amount=inv.amount,
        currency=inv.currency,
        status=inv.status,
        issued_at=inv.issued_at,
        has_pdf=has_pdf,
        email_status=inv.email_status,
        email_sent_at=inv.email_sent_at,
        email_message_id=inv.email_message_id,
        email_retry_count=inv.email_retry_count,
        email_error=inv.email_error,
        items=items_list,
    )


@router.get("/invoices/summary", response_model=InvoiceMetricsResponse)
def get_invoice_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: Consolidated invoice and email delivery operational metrics."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    total_invoices = db.query(func.count(Invoice.id)).scalar() or 0
    total_rev = db.query(func.sum(Invoice.amount)).filter(Invoice.status == "PAID").scalar() or Decimal("0.00")
    success_emails = db.query(func.count(Invoice.id)).filter(Invoice.email_status == "SENT").scalar() or 0
    failed_emails = db.query(func.count(Invoice.id)).filter(Invoice.email_status == "FAILED").scalar() or 0
    pending_emails = db.query(func.count(Invoice.id)).filter(Invoice.email_status == "PENDING").scalar() or 0

    return InvoiceMetricsResponse(
        total_invoices=total_invoices,
        total_revenue=total_rev,
        successful_deliveries=success_emails,
        failed_deliveries=failed_emails,
        pending_deliveries=pending_emails,
    )


@router.get("/invoices", response_model=List[InvoiceResponse])
def list_invoices(
    search: Optional[str] = Query(None, description="Search by invoice number, customer name, or email"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type: MEMBERSHIP, SHOP, CAFETERIA, BOOKING, RENTAL"),
    email_status: Optional[str] = Query(None, description="Filter by email status: SENT, FAILED, PENDING"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve invoices. Customers only see their own; Admins can search and filter club-wide."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    query = db.query(Invoice)

    if primary_role != "ADMIN":
        query = query.filter(Invoice.user_id == current_user.id)
    else:
        if search:
            s_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Invoice.invoice_number.ilike(s_term),
                    Invoice.customer_name.ilike(s_term),
                    Invoice.customer_email.ilike(s_term),
                    Invoice.reference_id.ilike(s_term),
                )
            )

    if transaction_type:
        query = query.filter(Invoice.transaction_type == transaction_type.strip().upper())

    if email_status:
        query = query.filter(Invoice.email_status == email_status.strip().upper())

    invoices = (
        query.order_by(Invoice.issued_at.desc(), Invoice.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_serialize_invoice(inv) for inv in invoices]


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice_detail(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve itemized details for an invoice, validating ownership."""
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    if primary_role != "ADMIN" and inv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to view this invoice")

    return _serialize_invoice(inv)


@router.get("/invoices/{invoice_id}/download")
def download_invoice_pdf(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream or download the official invoice PDF document."""
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    if primary_role != "ADMIN" and inv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to download this invoice")

    storage_dir = get_invoice_storage_dir()
    pdf_path = Path(inv.pdf_path) if inv.pdf_path else storage_dir / f"{inv.invoice_number}.pdf"

    if not pdf_path.exists():
        # Regenerate on the fly
        items = json.loads(inv.items_json) if inv.items_json else [{"description": inv.transaction_type, "quantity": 1, "unit_price": float(inv.amount), "discount": 0, "tax": 0, "total": float(inv.amount)}]
        generate_invoice_pdf(
            invoice_number=inv.invoice_number,
            issued_at=inv.issued_at,
            customer_name=inv.customer_name or f"{inv.user.first_name} {inv.user.last_name}".strip(),
            customer_email=inv.customer_email or inv.user.email,
            transaction_type=inv.transaction_type,
            items=items,
            subtotal=inv.subtotal,
            discount_amount=inv.discount_amount,
            tax_amount=inv.tax_amount,
            total_amount=inv.amount,
            currency=inv.currency,
            customer_id=str(inv.user_id),
            reference_id=inv.reference_id,
            output_path=pdf_path,
        )
        inv.pdf_path = str(pdf_path)
        db.commit()

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"{inv.invoice_number}.pdf",
    )


@router.post("/invoices/{invoice_id}/resend", response_model=ResendInvoiceEmailResponse)
def resend_invoice(
    invoice_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resend invoice email with PDF attachment to registered customer address."""
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)

    if primary_role != "ADMIN" and inv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to resend this invoice")

    success, message = resend_invoice_email(db, inv)
    if not success and "Please wait" in message:
        raise HTTPException(status_code=429, detail=message)

    return ResendInvoiceEmailResponse(
        success=success,
        message=message,
        email_status=inv.email_status,
        email_sent_at=inv.email_sent_at,
        email_retry_count=inv.email_retry_count,
    )


@router.get("/finance/email/diagnostics/status", response_model=EmailDiagnosticStatusResponse)
def get_email_diagnostic_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin-only protected diagnostic endpoint to inspect SendGrid environment configuration safely."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)
    if primary_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Admin privileges required for email diagnostics")

    settings = get_settings()
    key_configured = bool(settings.SENDGRID_API_KEY and settings.SENDGRID_API_KEY.strip())
    is_valid_format, key_msg = validate_sendgrid_key_format(settings.SENDGRID_API_KEY)

    failed_count = db.query(Invoice).filter(Invoice.email_status == "FAILED").count()
    sent_count = db.query(Invoice).filter(Invoice.email_status == "SENT").count()
    pending_count = db.query(Invoice).filter(Invoice.email_status == "PENDING").count()

    return EmailDiagnosticStatusResponse(
        key_configured=key_configured,
        key_format_valid=is_valid_format,
        key_diagnostic_message=key_msg,
        sender_email=settings.EMAIL_FROM or "Unset",
        sender_name=settings.EMAIL_FROM_NAME or "Apex Sports Club",
        storage_dir=settings.INVOICE_STORAGE_DIR,
        recent_failed_emails_count=failed_count,
        recent_sent_emails_count=sent_count,
        recent_pending_emails_count=pending_count,
    )


@router.post("/finance/email/diagnostics/test", response_model=EmailDiagnosticTestResponse)
def run_email_diagnostic_test(
    payload: EmailDiagnosticTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin-only protected diagnostic endpoint to trigger a real test email via SendGrid without creating fake purchases or invoices."""
    roles = [r.role.name for r in current_user.roles]
    primary_role = resolve_primary_role(roles)
    if primary_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Admin privileges required for email diagnostics")

    admin_identifier = f"{current_user.first_name} {current_user.last_name} ({current_user.email})".strip()
    result = send_diagnostic_test_email(to_email=str(payload.recipient_email), admin_user=admin_identifier)
    return EmailDiagnosticTestResponse(**result)
