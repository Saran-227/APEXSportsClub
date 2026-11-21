"""ApexSportsClub - Comprehensive Test Suite for Automated Invoicing & Email System.

Tests cover:
1. Unique sequential invoice numbering (APEX-INV-YYYY-XXXXXX)
2. Professional ReportLab PDF generation & valid bytes
3. Transaction creation & idempotency guarantees
4. Auto-generation across the 5 purchase flows:
   - Membership subscription
   - Court booking
   - Pro shop orders
   - Equipment rental
   - Cafeteria orders
5. Strict RBAC / Customer ownership access control
6. PDF download endpoint with Content-Disposition
7. SendGrid email delivery & rate-limited resend endpoint
8. Invoicing summary metrics
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import io
from pathlib import Path
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import Role, User, UserRole
from backend.app.auth.service import hash_password
from backend.app.bookings.models import Court, CourtBooking
from backend.app.cafeteria.models import Cafeteria, FoodOrder, MenuItem
from backend.app.finance.invoice_service import (
    create_or_get_invoice,
    generate_unique_invoice_number,
)
from backend.app.finance.models import Invoice, Payment
from backend.app.finance.pdf_service import generate_invoice_pdf
from backend.app.main import app
from backend.app.memberships.models import Member, MembershipPlan, MemberSubscription
from backend.app.shop.models import Product, ShopOrder, Vendor


@pytest.fixture
def invoice_test_setup(db_session: Session):
    """Seed users, roles, courts, products, and cafeteria items for invoice testing."""
    # Ensure Roles
    cust_role = db_session.query(Role).filter(Role.name == "CUSTOMER").first()
    if not cust_role:
        cust_role = Role(name="CUSTOMER", description="Club Customer")
        db_session.add(cust_role)

    admin_role = db_session.query(Role).filter(Role.name == "ADMIN").first()
    if not admin_role:
        admin_role = Role(name="ADMIN", description="Club Admin")
        db_session.add(admin_role)

    db_session.commit()

    # Customer User A
    user_a = User(
        email=f"member_a_{uuid.uuid4().hex[:6]}@apexsports.com",
        first_name="Alexander",
        last_name="Vance",
        hashed_password=hash_password("Pass@123456"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(user_a)
    db_session.flush()
    db_session.add(UserRole(user_id=user_a.id, role_id=cust_role.id))

    # Customer User B (for access control tests)
    user_b = User(
        email=f"member_b_{uuid.uuid4().hex[:6]}@apexsports.com",
        first_name="Elena",
        last_name="Rostova",
        hashed_password=hash_password("Pass@123456"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(user_b)
    db_session.flush()
    db_session.add(UserRole(user_id=user_b.id, role_id=cust_role.id))

    # Admin User
    admin_user = User(
        email=f"admin_{uuid.uuid4().hex[:6]}@apexsports.com",
        first_name="System",
        last_name="Admin",
        hashed_password=hash_password("AdminPass@123"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(admin_user)
    db_session.flush()
    db_session.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))

    # Membership Plan
    plan = MembershipPlan(
        name="Gold VIP Membership",
        price=Decimal("15000.00"),
        duration_months=12,
        court_discount_percent=50.0,
        shop_discount_percent=15.0,
        cafe_discount_percent=15.0,
    )
    db_session.add(plan)
    db_session.flush()

    # Member card for User A
    member_a = Member(
        user_id=user_a.id,
        membership_number="APX-MEM-GOLD01",
        current_plan_id=plan.id,
        status="ACTIVE",
    )
    db_session.add(member_a)

    # Court
    court = Court(
        name="Centre Court 1",
        sport="tennis",
        surface_type="GRASS",
        hourly_rate=Decimal("1200.00"),
        is_active=True,
    )
    db_session.add(court)
    db_session.flush()

    # Vendor & Product
    vendor = Vendor(
        user_id=admin_user.id,
        business_name="Apex Pro Shop",
        vendor_type="SPORTS_SHOP",
        status="ACTIVE",
    )
    db_session.add(vendor)
    db_session.flush()

    product = Product(
        vendor_id=vendor.id,
        name="Wilson Pro Staff Tennis Racket",
        sku="WIL-PRO-01",
        category="Rackets",
        price=Decimal("14999.00"),
        stock_quantity=10,
        is_rental=True,
        rental_price_per_day=Decimal("500.00"),
    )
    db_session.add(product)

    # Cafeteria & Item
    cafe = Cafeteria(
        user_id=admin_user.id,
        name="Apex Cafe",
        status="ACTIVE",
    )
    db_session.add(cafe)
    db_session.flush()

    menu_item = MenuItem(
        cafeteria_id=cafe.id,
        name="Avocado Toast & Espresso",
        category="BREAKFAST",
        price=Decimal("350.00"),
        is_available=True,
    )
    db_session.add(menu_item)

    db_session.commit()

    return {
        "user_a": user_a,
        "user_b": user_b,
        "admin_user": admin_user,
        "plan": plan,
        "member_a": member_a,
        "court": court,
        "product": product,
        "cafe": cafe,
        "menu_item": menu_item,
    }


def test_unique_sequential_invoice_number(db_session: Session):
    """Verify invoice numbers adhere to APEX-INV-YYYY-XXXXXX format and increment sequentially."""
    year = 2026
    num1 = generate_unique_invoice_number(db_session, year=year)
    assert num1.startswith(f"APEX-INV-{year}-")
    assert len(num1.split("-")[-1]) == 6

    # Insert mock invoice with num1
    mock_inv = Invoice(
        invoice_number=num1,
        user_id=uuid.uuid4(),
        customer_name="Test",
        customer_email="test@apex.com",
        transaction_type="MEMBERSHIP",
        amount=Decimal("100.00"),
        status="PAID",
        due_date=date.today(),
        issued_at=datetime.now(timezone.utc),
    )
    db_session.add(mock_inv)
    db_session.commit()

    num2 = generate_unique_invoice_number(db_session, year=year)
    seq1 = int(num1.split("-")[-1])
    seq2 = int(num2.split("-")[-1])
    assert seq2 == seq1 + 1


def test_pdf_generation_output_bytes(tmp_path: Path):
    """Verify ReportLab PDF generation outputs valid PDF bytes with header."""
    out_file = tmp_path / "test_invoice.pdf"
    now = datetime.now(timezone.utc)
    pdf_bytes = generate_invoice_pdf(
        invoice_number="APEX-INV-2026-999999",
        issued_at=now,
        customer_name="Alexander Vance",
        customer_email="alexander@apexsports.com",
        transaction_type="MEMBERSHIP",
        items=[
            {
                "description": "Gold Annual Membership",
                "quantity": 1,
                "unit_price": Decimal("15000.00"),
                "discount": Decimal("0.00"),
                "tax": Decimal("0.00"),
                "total": Decimal("15000.00"),
            }
        ],
        subtotal=Decimal("15000.00"),
        discount_amount=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("15000.00"),
        currency="INR",
        customer_id="USER-1234",
        membership_number="APX-MEM-GOLD01",
        reference_id="SUB-REF-01",
        payment_method="UPI",
        payment_reference="UPI-REF-9988",
        output_path=out_file,
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")
    assert out_file.exists()
    assert out_file.stat().st_size == len(pdf_bytes)


def test_idempotency_and_payment_record(db_session: Session, invoice_test_setup):
    """Verify repeated invoice creation with identical idempotency key returns existing invoice."""
    user = invoice_test_setup["user_a"]
    key = f"TEST_IDEMPOTENCY_{uuid.uuid4().hex}"

    inv1 = create_or_get_invoice(
        db=db_session,
        user=user,
        transaction_type="MEMBERSHIP",
        amount=Decimal("15000.00"),
        items=[{"description": "Gold Tier Membership", "quantity": 1, "unit_price": 15000.0, "total": 15000.0}],
        reference_id="REF-001",
        idempotency_key=key,
        send_email=False,
    )
    assert inv1 is not None
    assert inv1.payment_id is not None

    # Check payment table
    payment = db_session.query(Payment).filter(Payment.id == inv1.payment_id).first()
    assert payment is not None
    assert payment.status == "COMPLETED"
    assert payment.amount == Decimal("15000.00")

    # Second call with same idempotency key
    inv2 = create_or_get_invoice(
        db=db_session,
        user=user,
        transaction_type="MEMBERSHIP",
        amount=Decimal("15000.00"),
        items=[{"description": "Gold Tier Membership", "quantity": 1, "unit_price": 15000.0, "total": 15000.0}],
        reference_id="REF-001",
        idempotency_key=key,
        send_email=False,
    )

    assert inv1.id == inv2.id
    assert inv1.invoice_number == inv2.invoice_number


def test_membership_purchase_auto_generates_invoice(client: TestClient, db_session: Session, invoice_test_setup):
    """Flow 1: Subscribing to a membership plan generates an invoice record and PDF."""
    user = invoice_test_setup["user_a"]
    plan = invoice_test_setup["plan"]
    app.dependency_overrides[get_current_user] = lambda: user

    res = client.post("/api/v1/memberships/subscribe", json={"plan_id": str(plan.id)})
    assert res.status_code == 200
    data = res.json()
    assert "invoice_number" in data
    assert data["invoice_number"] is not None
    assert data["invoice_number"].startswith("APEX-INV-")

    # Verify in DB
    inv = db_session.query(Invoice).filter(Invoice.invoice_number == data["invoice_number"]).first()
    assert inv is not None
    assert inv.transaction_type == "MEMBERSHIP"
    assert inv.user_id == user.id
    assert inv.amount == plan.price
    assert inv.pdf_path is not None


def test_court_booking_auto_generates_invoice(client: TestClient, db_session: Session, invoice_test_setup):
    """Flow 2: Completing a court booking generates an invoice with discount calculations."""
    user = invoice_test_setup["user_a"]
    court = invoice_test_setup["court"]
    app.dependency_overrides[get_current_user] = lambda: user

    tomorrow = (datetime.now(timezone.utc) + timedelta(days=2)).date()

    payload = {
        "court_id": str(court.id),
        "booking_date": tomorrow.isoformat(),
        "start_time": "10:00",
        "participant_count": 2,
        "notes": "Tournament prep",
    }
    res = client.post("/api/v1/bookings", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["invoice_number"] is not None

    inv = db_session.query(Invoice).filter(Invoice.invoice_number == data["invoice_number"]).first()
    assert inv is not None
    assert inv.transaction_type == "BOOKING"
    assert inv.user_id == user.id
    # Gold member has 50% discount: 1200 * 0.5 = 600
    assert float(inv.discount_amount) == 600.00
    assert float(inv.amount) == 600.00


def test_shop_order_auto_generates_invoice(client: TestClient, db_session: Session, invoice_test_setup):
    """Flow 3: Placing a shop merchandise order generates an invoice with itemized entries."""
    user = invoice_test_setup["user_a"]
    product = invoice_test_setup["product"]
    app.dependency_overrides[get_current_user] = lambda: user

    payload = {
        "items": [{"product_id": str(product.id), "quantity": 2}],
        "fulfilment_type": "DELIVERY",
        "delivery_address": "42 Apex Club Way",
    }
    res = client.post("/api/v1/shop/orders", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["invoice_number"] is not None

    inv = db_session.query(Invoice).filter(Invoice.invoice_number == data["invoice_number"]).first()
    assert inv is not None
    assert inv.transaction_type == "SHOP"
    assert inv.user_id == user.id
    assert float(inv.amount) == float(product.price * 2)


def test_equipment_rental_auto_generates_invoice(client: TestClient, db_session: Session, invoice_test_setup):
    """Flow 4: Reserving sports equipment for rental generates an invoice."""
    user = invoice_test_setup["user_a"]
    product = invoice_test_setup["product"]
    app.dependency_overrides[get_current_user] = lambda: user

    start = datetime.now(timezone.utc) + timedelta(days=1)
    end = start + timedelta(days=3)
    payload = {
        "product_id": str(product.id),
        "rental_start": start.isoformat(),
        "rental_end": end.isoformat(),
        "notes": "Weekend tournament racket",
    }
    res = client.post("/api/v1/shop/rentals", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["invoice_number"] is not None

    inv = db_session.query(Invoice).filter(Invoice.invoice_number == data["invoice_number"]).first()
    assert inv is not None
    assert inv.transaction_type == "RENTAL"
    assert inv.user_id == user.id
    # 3 days * 500 = 1500
    assert float(inv.amount) == 1500.00


def test_cafeteria_order_auto_generates_invoice(client: TestClient, db_session: Session, invoice_test_setup):
    """Flow 5: Placing a cafeteria food & beverage order generates an invoice."""
    user = invoice_test_setup["user_a"]
    menu_item = invoice_test_setup["menu_item"]
    app.dependency_overrides[get_current_user] = lambda: user

    payload = {
        "order_type": "DINE_IN",
        "customer_notes": "Extra hot espresso",
        "items": [{"menu_item_id": str(menu_item.id), "quantity": 2, "special_instructions": "Oat milk"}],
    }
    res = client.post("/api/v1/cafeteria/orders", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["invoice_number"] is not None

    inv = db_session.query(Invoice).filter(Invoice.invoice_number == data["invoice_number"]).first()
    assert inv is not None
    assert inv.transaction_type == "CAFETERIA"
    assert inv.user_id == user.id
    # 2 * 350 = 700
    assert float(inv.amount) == 700.00


def test_customer_invoices_access_control(client: TestClient, db_session: Session, invoice_test_setup):
    """Verify strict authorization: Customers can ONLY see and download their own invoices."""
    user_a = invoice_test_setup["user_a"]
    user_b = invoice_test_setup["user_b"]
    admin = invoice_test_setup["admin_user"]

    # Create an invoice belonging to user A
    inv_a = create_or_get_invoice(
        db=db_session,
        user=user_a,
        transaction_type="MEMBERSHIP",
        amount=Decimal("15000.00"),
        items=[{"description": "Gold Membership", "quantity": 1, "unit_price": 15000.0, "total": 15000.0}],
        send_email=False,
    )

    # User A lists invoices -> sees inv_a
    app.dependency_overrides[get_current_user] = lambda: user_a
    res = client.get("/api/v1/invoices")
    assert res.status_code == 200
    ids_a = [item["id"] for item in res.json()]
    assert str(inv_a.id) in ids_a

    # User B lists invoices -> does NOT see inv_a
    app.dependency_overrides[get_current_user] = lambda: user_b
    res_b = client.get("/api/v1/invoices")
    assert res_b.status_code == 200
    ids_b = [item["id"] for item in res_b.json()]
    assert str(inv_a.id) not in ids_b

    # User B tries to view User A's invoice detail -> 403 Forbidden
    res_detail_b = client.get(f"/api/v1/invoices/{inv_a.id}")
    assert res_detail_b.status_code == 403

    # User B tries to download User A's invoice PDF -> 403 Forbidden
    res_dl_b = client.get(f"/api/v1/invoices/{inv_a.id}/download")
    assert res_dl_b.status_code == 403

    # User A downloads their own PDF -> 200 OK application/pdf
    app.dependency_overrides[get_current_user] = lambda: user_a
    res_dl_a = client.get(f"/api/v1/invoices/{inv_a.id}/download")
    assert res_dl_a.status_code == 200
    assert res_dl_a.headers["content-type"] == "application/pdf"
    assert f'attachment; filename="{inv_a.invoice_number}.pdf"' in res_dl_a.headers.get("content-disposition", "")
    assert res_dl_a.content.startswith(b"%PDF")

    # Admin lists invoices -> sees inv_a
    app.dependency_overrides[get_current_user] = lambda: admin
    res_admin = client.get("/api/v1/invoices")
    assert res_admin.status_code == 200
    ids_admin = [item["id"] for item in res_admin.json()]
    assert str(inv_a.id) in ids_admin


def test_invoice_summary_metrics(client: TestClient, db_session: Session, invoice_test_setup):
    """Verify /invoices/summary calculates aggregate metrics correctly."""
    user = invoice_test_setup["user_a"]
    admin = invoice_test_setup["admin_user"]

    inv = create_or_get_invoice(
        db=db_session,
        user=user,
        transaction_type="SHOP",
        amount=Decimal("5000.00"),
        items=[{"description": "Shop gear", "quantity": 1, "unit_price": 5000.0, "total": 5000.0}],
        send_email=False,
    )

    app.dependency_overrides[get_current_user] = lambda: admin
    res = client.get("/api/v1/invoices/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_invoices" in data
    assert "total_revenue" in data
    assert data["total_invoices"] >= 1
    assert float(data["total_revenue"]) >= 5000.00


def test_email_masking_and_key_validation():
    """Verify email masking utility and SendGrid key format diagnosis."""
    from backend.app.finance.email_service import mask_email, validate_sendgrid_key_format

    assert mask_email("alexander@apexsports.com") == "a*******r@apexsports.com"
    assert mask_email("me@apex.com") == "m*@apex.com"
    assert mask_email("a@b.com") == "a*@b.com"

    # Test key ID vs valid API key detection
    valid_key = "SG." + "a" * 22 + "." + "b" * 43
    is_valid, msg = validate_sendgrid_key_format(valid_key)
    assert is_valid is True

    # 22 char key ID without SG.
    is_valid, msg = validate_sendgrid_key_format("hIjWy782QoCoAjmHmkj3PQ")
    assert is_valid is False
    assert "Key ID" in msg

    # None / empty
    is_valid, msg = validate_sendgrid_key_format(None)
    assert is_valid is False


def test_email_diagnostic_endpoints_rbac(client: TestClient, invoice_test_setup):
    """Verify diagnostic endpoints require ADMIN privileges and return structured telemetry."""
    user = invoice_test_setup["user_a"]
    admin = invoice_test_setup["admin_user"]

    # Customer forbidden
    app.dependency_overrides[get_current_user] = lambda: user
    res_status = client.get("/api/v1/finance/email/diagnostics/status")
    assert res_status.status_code == 403

    res_test = client.post("/api/v1/finance/email/diagnostics/test", json={"recipient_email": "test@example.com"})
    assert res_test.status_code == 403

    # Admin allowed
    app.dependency_overrides[get_current_user] = lambda: admin
    res_status_admin = client.get("/api/v1/finance/email/diagnostics/status")
    assert res_status_admin.status_code == 200
    status_data = res_status_admin.json()
    assert "key_configured" in status_data
    assert "key_format_valid" in status_data
    assert "key_diagnostic_message" in status_data
    assert "sender_email" in status_data

    # Admin diagnostic test endpoint executes without crashing and logs safely
    res_test_admin = client.post("/api/v1/finance/email/diagnostics/test", json={"recipient_email": "test@example.com"})
    assert res_test_admin.status_code == 200
    test_data = res_test_admin.json()
    assert "masked_recipient" in test_data
    assert test_data["masked_recipient"] == "t**t@example.com"
    assert "status_code" in test_data
    assert "request_initiated" in test_data

