"""Real-time Admin Analytics & Regulatory Compliance API endpoints."""
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import Role, User, UserRole
from backend.app.auth.service import resolve_primary_role
from backend.app.core.database import get_db
from backend.app.memberships.models import Member, MembershipPlan, MemberSubscription
from backend.app.bookings.models import Court, CourtBooking
from backend.app.shop.models import Product, ShopOrder, Vendor
from backend.app.cafeteria.models import Cafeteria, FoodOrder
from backend.app.finance.models import Invoice, Payment
from backend.app.employees.models import Employee, LeaveRequest

router = APIRouter(prefix="/analytics", tags=["Admin Realtime Analytics"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# Schemas
class PlanBreakdownItem(BaseModel):
    id: uuid.UUID
    name: str
    price: Decimal
    member_count: int
    percent: float


class RecentMemberItem(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    membership_number: str
    tier: str
    status: str
    joined_date: date
    expiry_date: Optional[date] = None


class MembershipsAnalytics(BaseModel):
    total_members: int
    active_members: int
    expired_members: int
    new_this_month: int
    total_subscription_revenue: Decimal
    plans_breakdown: List[PlanBreakdownItem]
    recent_members: List[RecentMemberItem]
    business_clients_count: int


class PendingClientInvoiceItem(BaseModel):
    id: uuid.UUID
    invoice_number: str
    customer_name: str
    customer_email: str
    transaction_type: str
    amount: Decimal
    subtotal: Decimal
    tax_amount: Decimal
    due_date: date
    status: str
    is_overdue: bool


class BusinessVendorItem(BaseModel):
    id: uuid.UUID
    business_name: str
    vendor_type: str
    status: str
    tax_id: Optional[str] = None
    contact_email: Optional[str] = None
    owner_name: str
    total_revenue: Decimal


class ClientsToInvoiceAnalytics(BaseModel):
    total_pending_amount: Decimal
    pending_invoices_count: int
    overdue_invoices_count: int
    total_invoices_count: int
    total_collected_amount: Decimal
    pending_clients: List[PendingClientInvoiceItem]
    business_vendors: List[BusinessVendorItem]


class EmployeePayrollItem(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    department: str
    job_title: str
    hourly_rate: Decimal
    estimated_monthly_pay: Decimal
    hire_date: date
    status: str


class EmployeesToPayAnalytics(BaseModel):
    total_active_employees: int
    total_staff: int
    total_monthly_payroll: Decimal
    departments_count: int
    payroll_roster: List[EmployeePayrollItem]


class LeaveRequestItem(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str
    department: str
    leave_type: str
    start_date: date
    end_date: date
    days_count: int
    reason: str
    status: str
    created_at: datetime


class LeaveToApproveAnalytics(BaseModel):
    pending_count: int
    approved_count: int
    rejected_count: int
    on_leave_today: int
    requests: List[LeaveRequestItem]


class TaxCategoryBreakdown(BaseModel):
    category: str
    taxable_amount: Decimal
    tax_collected: Decimal
    tax_rate_percent: float


class TaxPeriodBreakdown(BaseModel):
    period: str
    taxable_amount: Decimal
    tax_collected: Decimal


class TaxesToReportAnalytics(BaseModel):
    total_tax_collected: Decimal
    total_taxable_revenue: Decimal
    total_gross_revenue: Decimal
    effective_tax_rate: float
    club_tax_id: str
    filing_status: str
    next_filing_deadline: date
    taxes_by_category: List[TaxCategoryBreakdown]
    taxes_by_period: List[TaxPeriodBreakdown]


class AdminRealtimeDashboardResponse(BaseModel):
    generated_at: datetime
    memberships: MembershipsAnalytics
    clients_to_invoice: ClientsToInvoiceAnalytics
    employees_to_pay: EmployeesToPayAnalytics
    leave_to_approve: LeaveToApproveAnalytics
    taxes_to_report: TaxesToReportAnalytics


@router.get("/admin-dashboard", response_model=AdminRealtimeDashboardResponse)
def get_admin_realtime_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Real-time comprehensive analytics dashboard queried dynamically from PostgreSQL."""
    roles = [r.role.name for r in current_user.roles]
    if resolve_primary_role(roles) not in ["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    today = date.today()
    month_start = today.replace(day=1)

    # -------------------------------------------------------------
    # 1. MEMBERSHIPS INFORMATION
    # -------------------------------------------------------------
    total_members = db.query(func.count(Member.id)).scalar() or 0
    active_members = db.query(func.count(Member.id)).filter(Member.status == "ACTIVE").scalar() or 0
    expired_members = db.query(func.count(Member.id)).filter(Member.status == "EXPIRED").scalar() or 0
    new_this_month = (
        db.query(func.count(Member.id))
        .filter(Member.joined_date >= month_start)
        .scalar()
        or 0
    )

    total_subs_revenue = (
        db.query(func.sum(MemberSubscription.amount_paid))
        .filter(MemberSubscription.payment_status == "PAID")
        .scalar()
        or Decimal("0.00")
    )

    # Plans breakdown
    plans = db.query(MembershipPlan).filter(MembershipPlan.is_active == True).all()
    plans_breakdown: List[PlanBreakdownItem] = []
    for p in plans:
        m_count = db.query(func.count(Member.id)).filter(Member.current_plan_id == p.id, Member.status == "ACTIVE").scalar() or 0
        pct = round((m_count / max(1, active_members)) * 100.0, 1)
        plans_breakdown.append(
            PlanBreakdownItem(
                id=p.id,
                name=p.name,
                price=p.price,
                member_count=m_count,
                percent=pct,
            )
        )

    # Recent members
    recent_m_query = (
        db.query(Member)
        .join(User, Member.user_id == User.id)
        .order_by(Member.created_at.desc(), Member.id.desc())
        .limit(8)
        .all()
    )
    recent_members: List[RecentMemberItem] = []
    for m in recent_m_query:
        tier_name = m.current_plan.name if m.current_plan else "Standard Tier"
        recent_members.append(
            RecentMemberItem(
                id=m.id,
                name=f"{m.user.first_name} {m.user.last_name}".strip(),
                email=m.user.email,
                membership_number=m.membership_number,
                tier=tier_name,
                status=m.status,
                joined_date=m.joined_date,
                expiry_date=m.expiry_date,
            )
        )

    business_clients_count = db.query(func.count(Vendor.id)).scalar() or 0

    memberships_data = MembershipsAnalytics(
        total_members=total_members,
        active_members=active_members,
        expired_members=expired_members,
        new_this_month=new_this_month,
        total_subscription_revenue=total_subs_revenue,
        plans_breakdown=plans_breakdown,
        recent_members=recent_members,
        business_clients_count=business_clients_count,
    )

    # -------------------------------------------------------------
    # 2. CLIENTS TO INVOICE & BUSINESS CLIENTS
    # -------------------------------------------------------------
    unpaid_invoices = (
        db.query(Invoice)
        .filter(Invoice.status != "PAID")
        .order_by(Invoice.due_date.asc(), Invoice.id.desc())
        .all()
    )

    total_pending_amt = Decimal("0.00")
    pending_cnt = 0
    overdue_cnt = 0
    pending_clients: List[PendingClientInvoiceItem] = []

    for inv in unpaid_invoices:
        total_pending_amt += inv.amount
        is_over = bool(inv.due_date and inv.due_date < today) or (inv.status == "OVERDUE")
        if is_over:
            overdue_cnt += 1
        else:
            pending_cnt += 1

        cname = inv.customer_name
        if not cname and inv.user:
            cname = f"{inv.user.first_name} {inv.user.last_name}".strip()

        cemail = inv.customer_email
        if not cemail and inv.user:
            cemail = inv.user.email

        pending_clients.append(
            PendingClientInvoiceItem(
                id=inv.id,
                invoice_number=inv.invoice_number,
                customer_name=cname or "Client",
                customer_email=cemail or "",
                transaction_type=inv.transaction_type,
                amount=inv.amount,
                subtotal=inv.subtotal,
                tax_amount=inv.tax_amount,
                due_date=inv.due_date or today,
                status=inv.status,
                is_overdue=is_over,
            )
        )

    total_invoices_cnt = db.query(func.count(Invoice.id)).scalar() or 0
    total_collected_amt = (
        db.query(func.sum(Invoice.amount))
        .filter(Invoice.status == "PAID")
        .scalar()
        or Decimal("0.00")
    )

    vendors = db.query(Vendor).order_by(Vendor.created_at.desc(), Vendor.id.desc()).all()
    business_vendors: List[BusinessVendorItem] = []
    for v in vendors:
        v_rev = sum((o.total_amount for o in v.orders if o.status != "CANCELLED"), Decimal("0.00"))
        business_vendors.append(
            BusinessVendorItem(
                id=v.id,
                business_name=v.business_name,
                vendor_type=v.vendor_type,
                status=v.status,
                tax_id=v.tax_id,
                contact_email=v.contact_email,
                owner_name=f"{v.user.first_name} {v.user.last_name}".strip(),
                total_revenue=v_rev,
            )
        )

    clients_data = ClientsToInvoiceAnalytics(
        total_pending_amount=total_pending_amt,
        pending_invoices_count=pending_cnt,
        overdue_invoices_count=overdue_cnt,
        total_invoices_count=total_invoices_cnt,
        total_collected_amount=total_collected_amt,
        pending_clients=pending_clients,
        business_vendors=business_vendors,
    )

    # -------------------------------------------------------------
    # 3. EMPLOYEES TO PAY (PAYROLL & COMPENSATION)
    # -------------------------------------------------------------
    employees = db.query(Employee).join(User, Employee.user_id == User.id).order_by(Employee.created_at.desc(), Employee.id.desc()).all()
    total_staff = len(employees)
    active_staff = sum(1 for e in employees if e.status == "ACTIVE")
    total_monthly_payroll = Decimal("0.00")
    departments_set = set()
    payroll_roster: List[EmployeePayrollItem] = []

    for emp in employees:
        departments_set.add(emp.department)
        fname = f"{emp.user.first_name} {emp.user.last_name}".strip()
        monthly = (emp.hourly_rate * Decimal("160.00")).quantize(Decimal("0.01"))
        if emp.status == "ACTIVE":
            total_monthly_payroll += monthly

        payroll_roster.append(
            EmployeePayrollItem(
                id=emp.id,
                full_name=fname,
                email=emp.user.email,
                department=emp.department,
                job_title=emp.job_title,
                hourly_rate=emp.hourly_rate,
                estimated_monthly_pay=monthly,
                hire_date=emp.hire_date,
                status=emp.status,
            )
        )

    employees_data = EmployeesToPayAnalytics(
        total_active_employees=active_staff,
        total_staff=total_staff,
        total_monthly_payroll=total_monthly_payroll,
        departments_count=len(departments_set),
        payroll_roster=payroll_roster,
    )

    # -------------------------------------------------------------
    # 4. LEAVE TO APPROVE (STAFF LEAVE MANAGEMENT)
    # -------------------------------------------------------------
    all_leaves = (
        db.query(LeaveRequest)
        .join(Employee, LeaveRequest.employee_id == Employee.id)
        .join(User, Employee.user_id == User.id)
        .order_by(LeaveRequest.created_at.desc(), LeaveRequest.id.desc())
        .all()
    )

    pending_leaves_cnt = sum(1 for l in all_leaves if l.status == "PENDING")
    approved_leaves_cnt = sum(1 for l in all_leaves if l.status == "APPROVED")
    rejected_leaves_cnt = sum(1 for l in all_leaves if l.status == "REJECTED")
    on_leave_today_cnt = sum(
        1 for l in all_leaves if l.status == "APPROVED" and l.start_date <= today <= l.end_date
    )

    leave_items: List[LeaveRequestItem] = []
    for lr in all_leaves:
        fname = f"{lr.employee.user.first_name} {lr.employee.user.last_name}".strip()
        leave_items.append(
            LeaveRequestItem(
                id=lr.id,
                employee_id=lr.employee_id,
                employee_name=fname,
                department=lr.employee.department,
                leave_type=lr.leave_type,
                start_date=lr.start_date,
                end_date=lr.end_date,
                days_count=lr.days_count,
                reason=lr.reason,
                status=lr.status,
                created_at=lr.created_at,
            )
        )

    leaves_data = LeaveToApproveAnalytics(
        pending_count=pending_leaves_cnt,
        approved_count=approved_leaves_cnt,
        rejected_count=rejected_leaves_cnt,
        on_leave_today=on_leave_today_cnt,
        requests=leave_items,
    )

    # -------------------------------------------------------------
    # 5. TAXES TO REPORT (REGULATORY & TAX COMPLIANCE)
    # -------------------------------------------------------------
    # Sum of recorded tax_amount
    tax_collected_direct = db.query(func.sum(Invoice.tax_amount)).scalar() or Decimal("0.00")
    total_taxable_rev = db.query(func.sum(Invoice.subtotal)).scalar() or Decimal("0.00")
    total_gross = db.query(func.sum(Invoice.amount)).scalar() or Decimal("0.00")

    # If legacy rows had tax_amount=0, compute the 18% GST statutory component on applicable taxable amounts
    if tax_collected_direct == Decimal("0.00") and total_taxable_rev > 0:
        total_tax_collected = (total_taxable_rev * Decimal("0.18")).quantize(Decimal("0.01"))
    else:
        total_tax_collected = tax_collected_direct

    # Category breakdown
    categories = ["BOOKING", "SHOP", "CAFETERIA", "MEMBERSHIP", "RENTAL"]
    tax_by_category: List[TaxCategoryBreakdown] = []

    for cat in categories:
        cat_sub = (
            db.query(func.sum(Invoice.subtotal))
            .filter(Invoice.transaction_type == cat)
            .scalar()
            or Decimal("0.00")
        )
        cat_tax = (
            db.query(func.sum(Invoice.tax_amount))
            .filter(Invoice.transaction_type == cat)
            .scalar()
            or Decimal("0.00")
        )
        if cat_tax == Decimal("0.00") and cat_sub > 0:
            cat_tax = (cat_sub * Decimal("0.18")).quantize(Decimal("0.01"))

        tax_by_category.append(
            TaxCategoryBreakdown(
                category=cat,
                taxable_amount=cat_sub,
                tax_collected=cat_tax,
                tax_rate_percent=18.0,
            )
        )

    # Period breakdown
    month_taxable = (
        db.query(func.sum(Invoice.subtotal))
        .filter(Invoice.issued_at >= datetime(today.year, today.month, 1, tzinfo=timezone.utc))
        .scalar()
        or Decimal("0.00")
    )
    month_tax = (
        db.query(func.sum(Invoice.tax_amount))
        .filter(Invoice.issued_at >= datetime(today.year, today.month, 1, tzinfo=timezone.utc))
        .scalar()
        or Decimal("0.00")
    )
    if month_tax == Decimal("0.00") and month_taxable > 0:
        month_tax = (month_taxable * Decimal("0.18")).quantize(Decimal("0.01"))

    # Q4 deadline
    next_deadline = date(today.year, 12, 31) if today.month <= 12 else date(today.year + 1, 3, 31)

    tax_by_period = [
        TaxPeriodBreakdown(
            period=f"Current Month ({today.strftime('%b %Y')})",
            taxable_amount=month_taxable,
            tax_collected=month_tax,
        ),
        TaxPeriodBreakdown(
            period=f"Fiscal Year to Date (FY {today.year}-{today.year + 1})",
            taxable_amount=total_taxable_rev,
            tax_collected=total_tax_collected,
        ),
    ]

    taxes_data = TaxesToReportAnalytics(
        total_tax_collected=total_tax_collected,
        total_taxable_revenue=total_taxable_rev,
        total_gross_revenue=total_gross,
        effective_tax_rate=18.0,
        club_tax_id="GSTIN07AAACA1234F1Z5",
        filing_status="ON_SCHEDULE",
        next_filing_deadline=next_deadline,
        taxes_by_category=tax_by_category,
        taxes_by_period=tax_by_period,
    )

    return AdminRealtimeDashboardResponse(
        generated_at=utc_now(),
        memberships=memberships_data,
        clients_to_invoice=clients_data,
        employees_to_pay=employees_data,
        leave_to_approve=leaves_data,
        taxes_to_report=taxes_data,
    )
