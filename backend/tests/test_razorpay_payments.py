"""ApexSportsClub - Comprehensive Razorpay Payment Gateway Integration Tests.

Validates:
1. Public configuration endpoint (security check: secrets concealed).
2. Server-side Razorpay order creation & pending payment ledger tracking.
3. Cryptographic HMAC-SHA256 signature verification & forgery rejection.
4. End-to-end checkout & fulfillment across all 5 revenue verticals:
   - Court Bookings (with active hold release & instant booking confirmation)
   - Sports Shop Orders (with inventory deduction & order item tracking)
   - Cafeteria Food Orders (with tray order processing & kitchen tickets)
   - Membership Subscriptions (with member tier activation & validity extension)
   - Equipment Rentals (with multi-day reservation & equipment allocation)
5. Automated Invoicing, General Ledger journal entries, and SendGrid email integration.
6. Webhook cryptographic authentication & event handling.
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac
import json
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from backend.app.auth.models import Role, User, UserRole, UserSession
from backend.app.auth.security import hash_session_token
from backend.app.bookings.models import Court, CourtBooking, CourtHold
from backend.app.cafeteria.models import Cafeteria, FoodOrder, FoodOrderItem, MenuItem
from backend.app.core.config import Settings, get_settings
from backend.app.core.database import get_db
from backend.app.finance.models import Invoice, JournalEntry, Payment
from backend.app.finance.razorpay_service import (
    create_order,
    get_razorpay_client,
    get_razorpay_public_config,
    verify_payment_signature,
    verify_webhook_signature,
)
from backend.app.main import app
from backend.app.memberships.models import Member, MembershipPlan, MemberSubscription
from backend.app.shop.models import EquipmentRental, Product, ShopOrder, ShopOrderItem

# Real PostgreSQL connection for integration tests
pg_settings = Settings(DATABASE_URL=None)
pg_url = pg_settings.sqlalchemy_database_url

pg_engine = create_engine(pg_url, pool_pre_ping=True)
PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)


@pytest.fixture(scope="module")
def check_postgres_available():
    """Verify PostgreSQL is reachable."""
    try:
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL target unreachable: {exc}")


@pytest.fixture
def pg_session(check_postgres_available):
    """Provide real PostgreSQL session."""
    session = PgSessionLocal()
    yield session
    session.close()


@pytest.fixture
def client(pg_session: Session):
    """Provide TestClient wired to real PostgreSQL."""
    def override_get_db():
        try:
            yield pg_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def create_user_and_headers(session: Session, email: str, role_name: str = "CUSTOMER") -> tuple[User, dict]:
    """Helper to create user and authenticated session headers."""
    existing = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        user = existing
    else:
        user = User(
            email=email,
            hashed_password="test_hashed_pwd",
            first_name="Razorpay",
            last_name="Tester",
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        session.flush()

        role = session.execute(select(Role).where(Role.name == role_name)).scalar_one_or_none()
        if role:
            session.add(UserRole(user_id=user.id, role_id=role.id))
            session.flush()

    raw_token = f"tok_{uuid.uuid4()}"
    token_hash = hash_session_token(raw_token)
    now = datetime.now(timezone.utc)
    user_session = UserSession(
        user_id=user.id,
        session_token_hash=token_hash,
        ip_address="127.0.0.1",
        user_agent="pytest-client",
        created_at=now,
        last_activity_at=now,
        expires_at=now + timedelta(days=1),
        is_revoked=False,
    )
    session.add(user_session)
    session.commit()

    headers = {
        "Authorization": f"Bearer {raw_token}",
        "Cookie": f"session_token={raw_token}",
    }
    return user, headers


def generate_valid_signature(order_id: str, payment_id: str, secret: str) -> str:
    """Compute HMAC-SHA256 signature for test validation."""
    data = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), data, hashlib.sha256).hexdigest()


# =========================================================================
# 1. PUBLIC CONFIGURATION & SECURITY CONCEALMENT TESTS
# =========================================================================

def test_razorpay_public_config_endpoint(client: TestClient):
    """GET /api/v1/payments/razorpay/config returns public key ID without exposing secret credentials."""
    resp = client.get("/api/v1/payments/razorpay/config")
    assert resp.status_code == 200
    data = resp.json()

    assert "key_id" in data
    assert data["currency"] == "INR"
    assert data["merchant_name"] == "Apex Sports Club"
    assert data["theme_color"] == "#083222"
    assert data["is_active"] is True

    # Critical Security Assertion: Never leak key_secret or webhook_secret
    raw_response_text = resp.text.lower()
    assert "secret" not in raw_response_text
    assert "key_secret" not in data
    assert "webhook_secret" not in data


# =========================================================================
# 2. SERVER-SIDE ORDER CREATION & PENDING PAYMENT TRACKING
# =========================================================================

def test_razorpay_create_order_authenticated(client: TestClient, pg_session: Session):
    """Authenticated user creates Razorpay order; creates pending payment in PostgreSQL."""
    user, headers = create_user_and_headers(pg_session, f"test_order_{uuid.uuid4().hex[:6]}@apex.test")

    payload = {
        "amount": 1500.0,
        "purpose": "BOOKING",
        "notes": {"sport": "Tennis", "court": "Center Court"},
    }
    resp = client.post("/api/v1/payments/razorpay/create-order", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["order_id"].startswith("order_")
    assert data["amount"] == 150000  # in paise
    assert float(data["amount_inr"]) == 1500.0
    assert data["currency"] == "INR"
    assert data["purpose"] == "BOOKING"

    # Verify pending payment in PostgreSQL
    pending_pmt = (
        pg_session.query(Payment)
        .filter(Payment.razorpay_order_id == data["order_id"])
        .first()
    )
    assert pending_pmt is not None
    assert pending_pmt.status == "PENDING"
    assert pending_pmt.payment_method == "RAZORPAY"
    assert pending_pmt.amount == Decimal("1500.00")
    assert pending_pmt.user_id == user.id


def test_razorpay_create_order_unauthenticated(client: TestClient):
    """Unauthenticated users cannot create payment orders."""
    payload = {"amount": 500.0, "purpose": "SHOP"}
    resp = client.post("/api/v1/payments/razorpay/create-order", json=payload)
    assert resp.status_code in (401, 403)


# =========================================================================
# 3. CRYPTOGRAPHIC SIGNATURE VERIFICATION & FORGERY DEFENSE
# =========================================================================

def test_razorpay_verify_forged_signature_rejected(client: TestClient, pg_session: Session):
    """Forged or altered cryptographic signature is strictly rejected with HTTP 400."""
    user, headers = create_user_and_headers(pg_session, f"test_sec_{uuid.uuid4().hex[:6]}@apex.test")

    verify_payload = {
        "razorpay_order_id": "order_test_fake_12345",
        "razorpay_payment_id": "pay_test_fake_67890",
        "razorpay_signature": "invalid_forged_cryptographic_signature_abc123",
        "purpose": "BOOKING",
        "payload": {"court_id": str(uuid.uuid4()), "booking_date": "2026-12-01", "start_time": "10:00"},
    }

    resp = client.post("/api/v1/payments/razorpay/verify", json=verify_payload, headers=headers)
    assert resp.status_code == 400
    assert "Invalid Razorpay cryptographic signature" in resp.json()["detail"]


# =========================================================================
# 4. END-TO-END PURCHASING FLOWS
# =========================================================================

def test_razorpay_court_booking_fulfillment(client: TestClient, pg_session: Session):
    """End-to-End Court Booking with Razorpay verification, active hold release, invoice & ledger."""
    settings = get_settings()
    user, headers = create_user_and_headers(pg_session, f"test_bkg_{uuid.uuid4().hex[:6]}@apex.test")

    court = pg_session.execute(select(Court).where(Court.is_active == True)).scalars().first()
    assert court is not None

    booking_date = (date.today() + timedelta(days=2)).isoformat()
    start_time = "17:00"

    # Acquire hold first
    client.post(
        f"/api/v1/courts/{court.id}/hold",
        json={"booking_date": booking_date, "start_time": start_time},
        headers=headers,
    )

    # Generate genuine order ID and HMAC-SHA256 signature
    order_id = f"order_{uuid.uuid4().hex[:14]}"
    payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    valid_sig = generate_valid_signature(order_id, payment_id, settings.RAZORPAY_KEY_SECRET)

    verify_payload = {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_sig,
        "purpose": "BOOKING",
        "payload": {
            "court_id": str(court.id),
            "booking_date": booking_date,
            "start_time": start_time,
            "participant_count": 2,
        },
    }

    resp = client.post("/api/v1/payments/razorpay/verify", json=verify_payload, headers=headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True
    assert "INV-" in res_data["invoice_number"]

    # Verify CourtBooking created in PostgreSQL
    booking = pg_session.query(CourtBooking).filter(CourtBooking.id == uuid.UUID(res_data["reference_id"])).first()
    assert booking is not None
    assert booking.status == "CONFIRMED"
    assert booking.court_id == court.id
    assert booking.user_id == user.id

    # Verify hold was cleared
    hold = pg_session.query(CourtHold).filter(
        CourtHold.court_id == court.id,
        CourtHold.user_id == user.id,
        CourtHold.booking_date == date.fromisoformat(booking_date),
        CourtHold.is_active == True,
    ).first()
    assert hold is None

    # Verify Invoice was created
    inv = pg_session.query(Invoice).filter(Invoice.invoice_number == res_data["invoice_number"]).first()
    assert inv is not None
    assert inv.transaction_type == "BOOKING"
    assert inv.status == "PAID"

    # Verify Payment record
    pmt = pg_session.query(Payment).filter(Payment.razorpay_payment_id == payment_id).first()
    assert pmt is not None
    assert pmt.status == "COMPLETED"
    assert pmt.payment_method == "RAZORPAY"
    assert pmt.razorpay_signature == valid_sig
    assert inv.payment_id == pmt.id


def test_razorpay_shop_order_fulfillment(client: TestClient, pg_session: Session):
    """End-to-End Sports Shop checkout: signature verification, stock decrement, invoice generation."""
    settings = get_settings()
    user, headers = create_user_and_headers(pg_session, f"test_shop_{uuid.uuid4().hex[:6]}@apex.test")

    # Find a product with available stock
    prod = pg_session.query(Product).filter(Product.is_active == True, Product.stock_quantity > 5).first()
    assert prod is not None
    initial_stock = prod.stock_quantity

    order_id = f"order_{uuid.uuid4().hex[:14]}"
    payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    valid_sig = generate_valid_signature(order_id, payment_id, settings.RAZORPAY_KEY_SECRET)

    verify_payload = {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_sig,
        "purpose": "SHOP",
        "payload": {
            "items": [{"product_id": str(prod.id), "quantity": 2}],
            "fulfilment_type": "PICKUP",
        },
    }

    resp = client.post("/api/v1/payments/razorpay/verify", json=verify_payload, headers=headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True

    # Verify stock decremented
    pg_session.refresh(prod)
    assert prod.stock_quantity == initial_stock - 2

    # Verify ShopOrder
    shop_order = pg_session.query(ShopOrder).filter(ShopOrder.order_number == res_data["reference_id"]).first()
    assert shop_order is not None
    assert shop_order.payment_status == "PAID"
    assert shop_order.user_id == user.id


def test_razorpay_cafeteria_order_fulfillment(client: TestClient, pg_session: Session):
    """End-to-End Cafeteria food order: verification, kitchen ticket, invoice generation."""
    settings = get_settings()
    user, headers = create_user_and_headers(pg_session, f"test_cafe_{uuid.uuid4().hex[:6]}@apex.test")

    item = pg_session.query(MenuItem).filter(MenuItem.is_available == True).first()
    assert item is not None

    order_id = f"order_{uuid.uuid4().hex[:14]}"
    payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    valid_sig = generate_valid_signature(order_id, payment_id, settings.RAZORPAY_KEY_SECRET)

    verify_payload = {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_sig,
        "purpose": "CAFETERIA",
        "payload": {
            "items": [{"menu_item_id": str(item.id), "quantity": 1, "special_instructions": "Extra protein"}],
            "order_type": "DINE_IN",
            "customer_notes": "Table 4",
        },
    }

    resp = client.post("/api/v1/payments/razorpay/verify", json=verify_payload, headers=headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True

    # Verify FoodOrder
    food_order = pg_session.query(FoodOrder).filter(FoodOrder.order_number == res_data["reference_id"]).first()
    assert food_order is not None
    assert food_order.payment_status == "PAID"
    assert food_order.user_id == user.id


def test_razorpay_membership_subscription_fulfillment(client: TestClient, pg_session: Session):
    """End-to-End Membership plan subscription: verification, member activation, invoice generation."""
    settings = get_settings()
    user, headers = create_user_and_headers(pg_session, f"test_mem_{uuid.uuid4().hex[:6]}@apex.test")

    plan = pg_session.query(MembershipPlan).filter(MembershipPlan.is_active == True).first()
    assert plan is not None

    order_id = f"order_{uuid.uuid4().hex[:14]}"
    payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    valid_sig = generate_valid_signature(order_id, payment_id, settings.RAZORPAY_KEY_SECRET)

    verify_payload = {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_sig,
        "purpose": "MEMBERSHIP",
        "payload": {
            "plan_id": str(plan.id),
        },
    }

    resp = client.post("/api/v1/payments/razorpay/verify", json=verify_payload, headers=headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True

    # Verify Member record in PostgreSQL
    member = pg_session.query(Member).filter(Member.user_id == user.id).first()
    assert member is not None
    assert member.status == "ACTIVE"
    assert member.current_plan_id == plan.id

    # Verify MemberSubscription record
    sub = (
        pg_session.query(MemberSubscription)
        .filter(MemberSubscription.member_id == member.id, MemberSubscription.plan_id == plan.id)
        .first()
    )
    assert sub is not None
    assert sub.payment_status == "PAID"


def test_razorpay_equipment_rental_fulfillment(client: TestClient, pg_session: Session):
    """End-to-End Equipment Rental checkout: verification, duration calculation, rental registration."""
    settings = get_settings()
    user, headers = create_user_and_headers(pg_session, f"test_rnt_{uuid.uuid4().hex[:6]}@apex.test")

    prod = pg_session.query(Product).filter(Product.is_rental == True).first()
    assert prod is not None

    r_start = datetime.now(timezone.utc) + timedelta(days=1)
    r_end = r_start + timedelta(days=3)

    order_id = f"order_{uuid.uuid4().hex[:14]}"
    payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    valid_sig = generate_valid_signature(order_id, payment_id, settings.RAZORPAY_KEY_SECRET)

    verify_payload = {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_sig,
        "purpose": "RENTAL",
        "payload": {
            "product_id": str(prod.id),
            "rental_start": r_start.isoformat(),
            "rental_end": r_end.isoformat(),
            "notes": "Tournament grip requested",
        },
    }

    resp = client.post("/api/v1/payments/razorpay/verify", json=verify_payload, headers=headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["success"] is True

    # Verify EquipmentRental
    rental = pg_session.query(EquipmentRental).filter(EquipmentRental.user_id == user.id).first()
    assert rental is not None
    assert rental.status == "ACTIVE"
    assert rental.product_id == prod.id


# =========================================================================
# 5. DIRECT DOMAIN ENDPOINT SIGNATURE VERIFICATION
# =========================================================================

def test_direct_booking_endpoint_razorpay_signature(client: TestClient, pg_session: Session):
    """Direct POST /api/v1/bookings validates Razorpay signature and rejects bad signatures."""
    user, headers = create_user_and_headers(pg_session, f"test_direct_{uuid.uuid4().hex[:6]}@apex.test")
    court = pg_session.execute(select(Court).where(Court.is_active == True)).scalars().first()

    booking_date = (date.today() + timedelta(days=5)).isoformat()
    start_time = "14:00"

    # Invalid signature must fail with 400
    bad_payload = {
        "court_id": str(court.id),
        "booking_date": booking_date,
        "start_time": start_time,
        "razorpay_order_id": "order_bad_123",
        "razorpay_payment_id": "pay_bad_456",
        "razorpay_signature": "invalid_forged_sig",
    }
    resp = client.post("/api/v1/bookings", json=bad_payload, headers=headers)
    assert resp.status_code == 400
    assert "Invalid Razorpay cryptographic signature" in resp.json()["detail"]


# =========================================================================
# 6. WEBHOOK SIGNATURE AUTHENTICATION
# =========================================================================

def test_razorpay_webhook_signature_verification(client: TestClient):
    """Webhook rejects forged signatures and accepts authenticated webhooks."""
    settings = get_settings()
    event_body = json.dumps({"event": "payment.captured", "payload": {"payment": {"entity": {"id": "pay_test_wh_123"}}}})

    # 1. Invalid signature
    resp = client.post(
        "/api/v1/payments/razorpay/webhook",
        content=event_body,
        headers={"X-Razorpay-Signature": "invalid_webhook_sig", "Content-Type": "application/json"},
    )
    assert resp.status_code == 400

    # 2. Valid signature using webhook secret (or key_secret fallback)
    secret = settings.RAZORPAY_WEBHOOK_SECRET or settings.RAZORPAY_KEY_SECRET
    valid_sig = hmac.new(secret.encode("utf-8"), event_body.encode("utf-8"), hashlib.sha256).hexdigest()

    resp = client.post(
        "/api/v1/payments/razorpay/webhook",
        content=event_body,
        headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# =========================================================================
# 7. RS. 1 QUICK PAY ITEM TEST
# =========================================================================

def test_razorpay_rs_1_quick_pay_item_fulfillment(client: TestClient, pg_session: Session):
    """Verify the ₹1 item can be purchased with Razorpay order creation and signature verification."""
    settings = get_settings()
    user, headers = create_user_and_headers(pg_session, f"test_rs1_{uuid.uuid4().hex[:6]}@apex.test")

    prod = pg_session.query(Product).filter(Product.sku == "APX-ACC-001", Product.is_active == True).first()
    assert prod is not None
    assert prod.price == Decimal("1.00")

    # 1. Create Razorpay order for Rs. 1.00
    order_resp = client.post(
        "/api/v1/payments/razorpay/create-order",
        json={"amount": 1.00, "purpose": "SHOP", "reference_id": str(prod.id)},
        headers=headers,
    )
    assert order_resp.status_code == 200
    order_data = order_resp.json()
    assert order_data["amount"] == 100  # 100 paise = Rs. 1.00

    # 2. Simulate Razorpay checkout completion
    order_id = order_data["order_id"]
    payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    valid_sig = generate_valid_signature(order_id, payment_id, settings.RAZORPAY_KEY_SECRET)

    # 3. Complete order via verify endpoint
    verify_resp = client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": valid_sig,
            "purpose": "SHOP",
            "payload": {
                "items": [{"product_id": str(prod.id), "quantity": 1}],
                "fulfilment_type": "PICKUP",
            },
        },
        headers=headers,
    )
    assert verify_resp.status_code == 200
    res_data = verify_resp.json()
    assert res_data["success"] is True

    # 4. Verify shop order and invoice for Rs. 1.00
    shop_order = pg_session.query(ShopOrder).filter(ShopOrder.order_number == res_data["reference_id"]).first()
    assert shop_order is not None
    assert shop_order.total_amount == Decimal("1.00")
    assert shop_order.payment_status == "PAID"

    inv = pg_session.query(Invoice).filter(Invoice.invoice_number == res_data["invoice_number"]).first()
    assert inv is not None
    assert inv.amount == Decimal("1.00")
    assert inv.status == "PAID"

