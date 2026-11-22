"""Unit and integration tests for Real-time Admin Dashboard Analytics and Employee Leave Management."""
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import Role, User, UserRole
from backend.app.auth.service import hash_password
from backend.app.employees.models import Employee, LeaveRequest
from backend.app.finance.models import Invoice
from backend.app.main import app
from backend.app.memberships.models import Member, MembershipPlan, MemberSubscription
from backend.app.shop.models import Vendor


@pytest.fixture
def analytics_setup(db_session: Session):
    """Seed roles, admin, customer, employees, plans, members, invoices, and leaves."""
    roles = {}
    for r_name in ["ADMIN", "CUSTOMER"]:
        r = db_session.query(Role).filter(Role.name == r_name).first()
        if not r:
            r = Role(name=r_name, description=r_name)
            db_session.add(r)
        roles[r_name] = r
    db_session.commit()

    admin = User(
        email="analytics_admin@apex.com",
        hashed_password=hash_password("Pass123!"),
        first_name="Admin",
        last_name="Malhotra",
        is_active=True,
        is_verified=True,
    )
    db_session.add(admin)
    db_session.flush()
    db_session.add(UserRole(user_id=admin.id, role_id=roles["ADMIN"].id))

    customer = User(
        email="analytics_cust@apex.com",
        hashed_password=hash_password("Pass123!"),
        first_name="Customer",
        last_name="Kapoor",
        is_active=True,
        is_verified=True,
    )
    db_session.add(customer)
    db_session.flush()
    db_session.add(UserRole(user_id=customer.id, role_id=roles["CUSTOMER"].id))

    # Staff user & employee
    staff_user = User(
        email="coach_carlos@apex.com",
        hashed_password=hash_password("Pass123!"),
        first_name="Carlos",
        last_name="Silva",
        is_active=True,
        is_verified=True,
    )
    db_session.add(staff_user)
    db_session.flush()

    emp = Employee(
        id=uuid.uuid4(),
        user_id=staff_user.id,
        department="Athletics",
        job_title="Head Tennis Coach",
        hourly_rate=Decimal("50.00"),
        hire_date=date(2025, 1, 1),
        status="ACTIVE",
    )
    db_session.add(emp)
    db_session.flush()

    # Membership plan & member
    plan = MembershipPlan(
        id=uuid.uuid4(),
        name="Gold Championship Tier",
        price=Decimal("15000.00"),
        duration_months=12,
        court_discount_percent=20.0,
        shop_discount_percent=15.0,
        cafe_discount_percent=10.0,
        is_active=True,
    )
    db_session.add(plan)
    db_session.flush()

    mem = Member(
        id=uuid.uuid4(),
        user_id=customer.id,
        membership_number="APX-TEST-001",
        status="ACTIVE",
        joined_date=date.today(),
        expiry_date=date.today() + timedelta(days=365),
        current_plan_id=plan.id,
    )
    db_session.add(mem)

    sub = MemberSubscription(
        id=uuid.uuid4(),
        member_id=mem.id,
        plan_id=plan.id,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=365),
        amount_paid=Decimal("15000.00"),
        payment_status="PAID",
    )
    db_session.add(sub)

    # Invoices (one overdue, one pending, one paid)
    today = date.today()
    inv_overdue = Invoice(
        id=uuid.uuid4(),
        invoice_number="INV-TEST-001",
        user_id=customer.id,
        customer_name="Royal Tennis Academy",
        customer_email="corporate@royaltennis.in",
        transaction_type="BOOKING",
        amount=Decimal("35400.00"),
        subtotal=Decimal("30000.00"),
        tax_amount=Decimal("5400.00"),
        currency="INR",
        status="OVERDUE",
        due_date=today - timedelta(days=2),
    )
    inv_pending = Invoice(
        id=uuid.uuid4(),
        invoice_number="INV-TEST-002",
        user_id=customer.id,
        customer_name="Apex Pro Shop",
        customer_email="shop@apex.com",
        transaction_type="RENTAL",
        amount=Decimal("17700.00"),
        subtotal=Decimal("15000.00"),
        tax_amount=Decimal("2700.00"),
        currency="INR",
        status="PENDING",
        due_date=today + timedelta(days=5),
    )
    inv_paid = Invoice(
        id=uuid.uuid4(),
        invoice_number="INV-TEST-003",
        user_id=customer.id,
        customer_name="Customer Kapoor",
        customer_email="customer@apex.com",
        transaction_type="MEMBERSHIP",
        amount=Decimal("15000.00"),
        subtotal=Decimal("15000.00"),
        tax_amount=Decimal("0.00"),
        currency="INR",
        status="PAID",
        due_date=today,
    )
    db_session.add_all([inv_overdue, inv_pending, inv_paid])

    # Leave request
    leave = LeaveRequest(
        id=uuid.uuid4(),
        employee_id=emp.id,
        leave_type="SICK",
        start_date=today,
        end_date=today + timedelta(days=2),
        days_count=2,
        reason="Knee physiotherapy rehabilitation",
        status="PENDING",
    )
    db_session.add(leave)

    db_session.commit()

    return {
        "admin": admin,
        "customer": customer,
        "employee": emp,
        "leave": leave,
        "plan": plan,
        "member": mem,
    }


def test_admin_realtime_dashboard_endpoint(client: TestClient, analytics_setup):
    """Verify real-time admin analytics aggregated payload from database."""
    app.dependency_overrides[get_current_user] = lambda: analytics_setup["admin"]

    resp = client.get("/api/v1/analytics/admin-dashboard")
    assert resp.status_code == 200
    data = resp.json()

    # 1. Memberships
    assert "memberships" in data
    m = data["memberships"]
    assert m["total_members"] >= 1
    assert m["active_members"] >= 1
    assert len(m["plans_breakdown"]) >= 1
    assert float(m["total_subscription_revenue"]) == 15000.0

    # 2. Clients to Invoice
    assert "clients_to_invoice" in data
    c = data["clients_to_invoice"]
    assert c["pending_invoices_count"] >= 1
    assert c["overdue_invoices_count"] >= 1
    assert float(c["total_pending_amount"]) == 53100.0  # 35400 + 17700

    # 3. Employees to Pay
    assert "employees_to_pay" in data
    e = data["employees_to_pay"]
    assert e["total_active_employees"] >= 1
    assert float(e["total_monthly_payroll"]) == 8000.0  # 50.00 * 160h

    # 4. Leave to Approve
    assert "leave_to_approve" in data
    l = data["leave_to_approve"]
    assert l["pending_count"] >= 1
    assert len(l["requests"]) >= 1

    # 5. Taxes to Report
    assert "taxes_to_report" in data
    t = data["taxes_to_report"]
    assert float(t["total_tax_collected"]) == 8100.0  # 5400 + 2700
    assert float(t["effective_tax_rate"]) == 18.0
    assert t["club_tax_id"] == "GSTIN07AAACA1234F1Z5"


def test_customer_forbidden_from_admin_dashboard(client: TestClient, analytics_setup):
    """Non-admin customer must be denied access to admin analytics."""
    app.dependency_overrides[get_current_user] = lambda: analytics_setup["customer"]

    resp = client.get("/api/v1/analytics/admin-dashboard")
    assert resp.status_code == 403


def test_leave_approval_workflow(client: TestClient, analytics_setup):
    """Admin can approve a pending leave request and update employee status."""
    app.dependency_overrides[get_current_user] = lambda: analytics_setup["admin"]
    leave_id = str(analytics_setup["leave"].id)

    # Approve
    resp = client.patch(
        f"/api/v1/employees/leaves/{leave_id}/approve",
        json={"admin_notes": "Approved for medical rehab"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "APPROVED"
    assert data["admin_notes"] == "Approved for medical rehab"
    assert data["reviewed_at"] is not None


def test_leave_rejection_workflow(client: TestClient, db_session: Session, analytics_setup):
    """Admin can reject a leave request with notes."""
    app.dependency_overrides[get_current_user] = lambda: analytics_setup["admin"]

    # Create fresh leave
    new_leave = LeaveRequest(
        id=uuid.uuid4(),
        employee_id=analytics_setup["employee"].id,
        leave_type="CASUAL",
        start_date=date.today() + timedelta(days=10),
        end_date=date.today() + timedelta(days=11),
        days_count=1,
        reason="Tournament coaching conflict",
        status="PENDING",
    )
    db_session.add(new_leave)
    db_session.commit()

    resp = client.patch(
        f"/api/v1/employees/leaves/{new_leave.id}/reject",
        json={"admin_notes": "All coaches needed for Junior Open Championship"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "REJECTED"
    assert data["admin_notes"] == "All coaches needed for Junior Open Championship"


def test_employees_payroll_summary(client: TestClient, analytics_setup):
    """Verify employees payroll calculation endpoint."""
    app.dependency_overrides[get_current_user] = lambda: analytics_setup["admin"]

    resp = client.get("/api/v1/employees/payroll")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_staff"] >= 1
    assert data["active_staff"] >= 1
    assert float(data["total_monthly_payroll"]) >= 8000.0
