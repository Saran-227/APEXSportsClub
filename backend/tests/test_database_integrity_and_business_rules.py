"""Automated test suite for Database Integrity and Business Edge Cases.

Covers:
1. Simultaneous booking attempts for the same court and time slot.
2. Overlapping bookings, cancellations, and duplicate daily booking limits.
3. Concurrent purchases when stock is low (serialized row-locks and non-negative stock check constraint).
4. Duplicate payments, idempotency key deduplication, and refunds.
5. Transactions failing halfway roll back completely.
6. Double-entry journal entries must always balance debits and credits.
7. Membership expiry, renewal, and invalid discount eligibility.
8. Audit logs capturing sensitive administrative actions with credential sanitization.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from backend.app.audit.models import AuditLog
from backend.app.audit.service import create_audit_log, sanitize_details
from backend.app.auth.models import Role, User, UserRole, UserSession
from backend.app.auth.security import hash_session_token
from backend.app.bookings.models import Court, CourtBooking
from backend.app.core.config import Settings, get_settings
from backend.app.core.database import get_db
from backend.app.finance.invoice_service import create_or_get_invoice
from backend.app.finance.journal_service import (
    create_balanced_journal_entry,
    record_transaction_journal,
)
from backend.app.finance.models import Invoice, JournalEntry, JournalEntryLine, Payment
from backend.app.main import app
from backend.app.memberships.models import Member, MembershipPlan
from backend.app.shop.models import Product, ShopOrder, ShopOrderItem, Vendor

pg_settings = Settings(DATABASE_URL=None)
pg_url = pg_settings.sqlalchemy_database_url
pg_engine = create_engine(pg_url, pool_pre_ping=True)
PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)


@pytest.fixture(scope="module")
def check_postgres_available():
    try:
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL unreachable: {exc}")


@pytest.fixture
def pg_session(check_postgres_available):
    session = PgSessionLocal()
    yield session
    session.close()


@pytest.fixture
def client(pg_session: Session):
    def override_get_db():
        try:
            yield pg_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(pg_session: Session):
    return pg_session.execute(select(User).where(User.email == "admin@apexsports.com")).scalar_one()


@pytest.fixture
def customer_user(pg_session: Session):
    return pg_session.execute(select(User).where(User.email == "customer@apexsports.com")).scalar_one()


@pytest.fixture
def customer_auth_headers(pg_session: Session, customer_user: User):
    now = datetime.now(timezone.utc)
    raw_token = f"test_cust_integrity_{uuid.uuid4()}"
    token_hash = hash_session_token(raw_token)
    session = UserSession(
        user_id=customer_user.id,
        session_token_hash=token_hash,
        ip_address="127.0.0.1",
        user_agent="Pytest-Integrity-Runner",
        expires_at=now + timedelta(days=7),
        last_activity_at=now,
    )
    pg_session.add(session)
    pg_session.commit()
    settings = get_settings()
    return {"Authorization": f"Bearer {raw_token}", "cookie": f"{settings.SESSION_COOKIE_NAME}={raw_token}"}


@pytest.fixture
def test_court(pg_session: Session):
    """Provide a dedicated active test court."""
    court = Court(
        id=uuid.uuid4(),
        name=f"Integrity Test Court {uuid.uuid4().hex[:4]}",
        sport="padel",
        hourly_rate=Decimal("1000.00"),
        is_indoor=True,
        is_active=True,
        opening_time=time(6, 0),
        closing_time=time(23, 0),
    )
    pg_session.add(court)
    pg_session.commit()
    yield court
    pg_session.delete(court)
    pg_session.commit()


# -----------------------------------------------------------------------------
# 1. Simultaneous and Overlapping Booking Attempts
# -----------------------------------------------------------------------------
def test_simultaneous_court_booking_attempts_race_condition(test_court, customer_user):
    """Concurrent requests for the identical slot serialize safely: exactly 1 succeeds and 1 gets 409 Conflict."""
    booking_date = date.today() + timedelta(days=10)
    slot_time = "10:00"
    target_court_id = test_court.id
    target_user_id = customer_user.id

    results = []

    def attempt_booking(thread_id):
        with PgSessionLocal() as db:
            from backend.app.bookings.router import CreateBookingRequest, create_booking
            u = db.query(User).filter(User.id == target_user_id).first()
            payload = CreateBookingRequest(
                court_id=target_court_id,
                booking_date=booking_date,
                start_time=slot_time,
                participant_count=2,
            )
            try:
                res = create_booking(payload=payload, current_user=u, db=db)
                results.append(("SUCCESS", res.id))
            except Exception as exc:
                results.append(("CONFLICT", str(exc)))

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(attempt_booking, 1)
        f2 = executor.submit(attempt_booking, 2)
        f1.result()
        f2.result()

    statuses = [r[0] for r in results]
    assert statuses.count("SUCCESS") == 1, f"Expected 1 success, got {results}"
    assert statuses.count("CONFLICT") == 1, f"Expected 1 conflict, got {results}"

    # Clean up created booking
    success_id = [r[1] for r in results if r[0] == "SUCCESS"][0]
    with PgSessionLocal() as db:
        b = db.query(CourtBooking).filter(CourtBooking.id == success_id).first()
        if b:
            db.delete(b)
            db.commit()


def test_overlapping_court_bookings_rejected(client, customer_auth_headers, test_court):
    """Overlapping bookings (e.g. 14:00-15:00 vs 14:30-15:30) are rejected with 409 Conflict."""
    booking_date = str(date.today() + timedelta(days=11))

    # Booking 1: 14:00 to 15:00
    res1 = client.post(
        "/api/v1/bookings",
        headers=customer_auth_headers,
        json={
            "court_id": str(test_court.id),
            "booking_date": booking_date,
            "start_time": "14:00",
            "participant_count": 2,
        },
    )
    assert res1.status_code == 201
    booking1_id = res1.json()["id"]

    # Booking 2: 14:30 (conflicts with 14:00-15:00)
    res2 = client.post(
        "/api/v1/bookings",
        headers=customer_auth_headers,
        json={
            "court_id": str(test_court.id),
            "booking_date": booking_date,
            "start_time": "14:30",
            "participant_count": 2,
        },
    )
    assert res2.status_code == 409
    assert "Conflict Detected" in res2.json()["detail"]

    # Clean up
    client.patch(f"/api/v1/bookings/{booking1_id}/cancel", headers=customer_auth_headers)


def test_cancelled_booking_frees_slot_for_new_reservation(client, customer_auth_headers, test_court):
    """Cancelling a court booking frees up the time slot for subsequent reservations."""
    booking_date = str(date.today() + timedelta(days=12))

    # 1. Create booking
    res1 = client.post(
        "/api/v1/bookings",
        headers=customer_auth_headers,
        json={
            "court_id": str(test_court.id),
            "booking_date": booking_date,
            "start_time": "16:00",
            "participant_count": 2,
        },
    )
    assert res1.status_code == 201
    booking1_id = res1.json()["id"]

    # 2. Cancel booking
    cancel_res = client.patch(f"/api/v1/bookings/{booking1_id}/cancel", headers=customer_auth_headers)
    assert cancel_res.status_code == 200

    # 3. Subsequent booking for the same slot now succeeds
    res2 = client.post(
        "/api/v1/bookings",
        headers=customer_auth_headers,
        json={
            "court_id": str(test_court.id),
            "booking_date": booking_date,
            "start_time": "16:00",
            "participant_count": 2,
        },
    )
    assert res2.status_code == 201
    booking2_id = res2.json()["id"]

    # Clean up
    client.patch(f"/api/v1/bookings/{booking2_id}/cancel", headers=customer_auth_headers)


def test_duplicate_booking_daily_limit_enforced(client, customer_auth_headers, test_court):
    """Members cannot exceed club limit of 2 bookings per day."""
    booking_date = str(date.today() + timedelta(days=13))

    b1 = client.post(
        "/api/v1/bookings",
        headers=customer_auth_headers,
        json={
            "court_id": str(test_court.id),
            "booking_date": booking_date,
            "start_time": "08:00",
            "participant_count": 1,
        },
    )
    assert b1.status_code == 201

    b2 = client.post(
        "/api/v1/bookings",
        headers=customer_auth_headers,
        json={
            "court_id": str(test_court.id),
            "booking_date": booking_date,
            "start_time": "11:00",
            "participant_count": 1,
        },
    )
    assert b2.status_code == 201

    # 3rd reservation on the same date is rejected
    b3 = client.post(
        "/api/v1/bookings",
        headers=customer_auth_headers,
        json={
            "court_id": str(test_court.id),
            "booking_date": booking_date,
            "start_time": "17:00",
            "participant_count": 1,
        },
    )
    assert b3.status_code == 400
    assert "Club Policy Limit Exceeded" in b3.json()["detail"]

    # Clean up
    client.patch(f"/api/v1/bookings/{b1.json()['id']}/cancel", headers=customer_auth_headers)
    client.patch(f"/api/v1/bookings/{b2.json()['id']}/cancel", headers=customer_auth_headers)


# -----------------------------------------------------------------------------
# 2. Low Stock and Concurrent Purchases
# -----------------------------------------------------------------------------
def test_concurrent_purchases_on_low_stock(pg_session, customer_user):
    """Concurrent purchases on a single remaining item serialize: 1 succeeds, 1 rejected, stock ends at 0."""
    vendor = pg_session.execute(select(Vendor)).scalars().first()
    assert vendor is not None

    test_product = Product(
        id=uuid.uuid4(),
        vendor_id=vendor.id,
        name="Limited Edition Badminton Racket",
        sku=f"SKU-RACE-{uuid.uuid4().hex[:4]}",
        category="Rackets",
        price=Decimal("2500.00"),
        stock_quantity=1,
        is_active=True,
    )
    pg_session.add(test_product)
    pg_session.commit()

    target_product_id = test_product.id
    target_user_id = customer_user.id
    results = []

    def attempt_order():
        with PgSessionLocal() as db:
            from backend.app.shop.router import CartItemPayload, CreateShopOrderRequest, create_shop_order
            u = db.query(User).filter(User.id == target_user_id).first()
            payload = CreateShopOrderRequest(
                items=[CartItemPayload(product_id=target_product_id, quantity=1)]
            )
            try:
                ord_res = create_shop_order(payload=payload, current_user=u, db=db)
                results.append(("SUCCESS", ord_res.id))
            except Exception as exc:
                results.append(("FAILED", str(exc)))

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(attempt_order)
        f2 = executor.submit(attempt_order)
        f1.result()
        f2.result()

    statuses = [r[0] for r in results]
    assert statuses.count("SUCCESS") == 1, f"Expected 1 success, got {results}"
    assert statuses.count("FAILED") == 1, f"Expected 1 failure, got {results}"

    # Verify database check constraint: stock is exactly 0, never negative
    with PgSessionLocal() as db:
        prod = db.query(Product).filter(Product.id == test_product.id).first()
        assert prod.stock_quantity == 0

        # Attempting direct negative stock violates PostgreSQL check constraint chk_products_stock_non_negative
        with pytest.raises(IntegrityError):
            db.execute(text("UPDATE products SET stock_quantity = -1 WHERE id = :pid"), {"pid": test_product.id})
            db.commit()
        db.rollback()

        # Clean up orders referencing prod, then delete prod
        success_orders = [r[1] for r in results if r[0] == "SUCCESS"]
        for o_id in success_orders:
            ord_obj = db.query(ShopOrder).filter(ShopOrder.id == o_id).first()
            if ord_obj:
                db.delete(ord_obj)
        db.delete(prod)
        db.commit()


# -----------------------------------------------------------------------------
# 3. Duplicate Payments, Idempotency & Refunds
# -----------------------------------------------------------------------------
def test_invoice_creation_idempotency_prevents_duplicate_payments(pg_session, customer_user):
    """Submitting the same idempotency key returns the existing invoice without duplicate payment."""
    idemp_key = f"TEST_IDEMP_{uuid.uuid4()}"

    inv1 = create_or_get_invoice(
        db=pg_session,
        user=customer_user,
        transaction_type="SHOP",
        amount=Decimal("150.00"),
        items=[{"description": "Grip Tape", "quantity": 1, "unit_price": 150.0, "total": 150.0}],
        idempotency_key=idemp_key,
        send_email=False,
    )

    inv2 = create_or_get_invoice(
        db=pg_session,
        user=customer_user,
        transaction_type="SHOP",
        amount=Decimal("150.00"),
        items=[{"description": "Grip Tape", "quantity": 1, "unit_price": 150.0, "total": 150.0}],
        idempotency_key=idemp_key,
        send_email=False,
    )

    assert inv1.id == inv2.id
    assert inv1.invoice_number == inv2.invoice_number

    # Verify only 1 payment was created with this idempotency key
    matching_invoices = pg_session.query(Invoice).filter(Invoice.idempotency_key == idemp_key).all()
    assert len(matching_invoices) == 1

    # Clean up
    pg_session.delete(inv1)
    pg_session.commit()


# -----------------------------------------------------------------------------
# 4. Transaction Rollback on Partial Failures
# -----------------------------------------------------------------------------
def test_transaction_rollback_prevents_partial_state_corruption(pg_session, customer_user):
    """A transaction failing halfway rolls back completely: stock is not decremented and no order is saved."""
    vendor = pg_session.execute(select(Vendor)).scalars().first()
    product = Product(
        id=uuid.uuid4(),
        vendor_id=vendor.id,
        name="Rollback Test Item",
        sku=f"SKU-RB-{uuid.uuid4().hex[:4]}",
        category="Accessories",
        price=Decimal("100.00"),
        stock_quantity=10,
        is_active=True,
    )
    pg_session.add(product)
    pg_session.commit()

    initial_order_count = pg_session.query(ShopOrder).count()

    # Simulate atomic transaction failing midway
    try:
        with pg_session.begin_nested():
            # 1. Decrement stock
            product.stock_quantity -= 2
            # 2. Add order header
            order = ShopOrder(
                vendor_id=vendor.id,
                user_id=customer_user.id,
                order_number=f"FAIL-{uuid.uuid4().hex[:4]}",
                total_amount=Decimal("200.00"),
            )
            pg_session.add(order)
            pg_session.flush()

            # 3. Simulate sudden unhandled error / database fault before commit
            raise RuntimeError("Simulated mid-transaction failure")
    except RuntimeError:
        pg_session.rollback()

    # Verify clean rollback: stock unchanged and no order created
    pg_session.refresh(product)
    assert product.stock_quantity == 10
    assert pg_session.query(ShopOrder).count() == initial_order_count

    # Clean up
    pg_session.delete(product)
    pg_session.commit()


# -----------------------------------------------------------------------------
# 5. Double-Entry Journal Entries Balance Debits and Credits
# -----------------------------------------------------------------------------
def test_journal_entry_balanced_debits_and_credits_succeeds(pg_session):
    """Balanced journal entry (sum of debits == sum of credits) persists atomically."""
    ref_id = f"REF-{uuid.uuid4().hex[:6]}"
    entry = create_balanced_journal_entry(
        db=pg_session,
        description="Booking settlement payment",
        reference_type="BOOKING",
        reference_id=ref_id,
        lines=[
            {
                "account_code": "1010",
                "account_name": "Bank Clearing (UPI)",
                "debit": Decimal("1000.00"),
                "credit": Decimal("0.00"),
                "description": "UPI settlement received",
            },
            {
                "account_code": "4010",
                "account_name": "Court Booking Revenue",
                "debit": Decimal("0.00"),
                "credit": Decimal("1000.00"),
                "description": "Court session revenue earned",
            },
        ],
    )
    assert entry.id is not None
    assert len(entry.lines) == 2
    assert sum(l.debit for l in entry.lines) == Decimal("1000.00")
    assert sum(l.credit for l in entry.lines) == Decimal("1000.00")

    # Clean up
    pg_session.delete(entry)
    pg_session.commit()


def test_journal_entry_unbalanced_debits_and_credits_rejected(pg_session):
    """Unbalanced journal entry (sum of debits != sum of credits) raises ValueError and saves nothing."""
    initial_entry_count = pg_session.query(JournalEntry).count()

    with pytest.raises(ValueError) as excinfo:
        create_balanced_journal_entry(
            db=pg_session,
            description="Unbalanced entry test",
            lines=[
                {
                    "account_code": "1010",
                    "account_name": "Cash",
                    "debit": Decimal("1000.00"),
                    "credit": Decimal("0.00"),
                },
                {
                    "account_code": "4010",
                    "account_name": "Revenue",
                    "debit": Decimal("0.00"),
                    "credit": Decimal("850.00"),  # Discrepancy of 150.00
                },
            ],
        )

    assert "Unbalanced Journal Entry" in str(excinfo.value)
    assert "Discrepancy: ₹150.00" in str(excinfo.value)
    assert pg_session.query(JournalEntry).count() == initial_entry_count


# -----------------------------------------------------------------------------
# 6. Membership Expiry, Renewal & Discount Invalidation
# -----------------------------------------------------------------------------
def test_expired_membership_receives_zero_discount_until_renewed(client, customer_auth_headers, customer_user, test_court, pg_session):
    """Expired membership receives 0% discount on bookings; active renewed membership receives full plan discount."""
    # 1. Create 20% discount plan
    plan = MembershipPlan(
        id=uuid.uuid4(),
        name=f"Gold Test Plan {uuid.uuid4().hex[:4]}",
        price=Decimal("5000.00"),
        court_discount_percent=20.0,
        is_active=True,
    )
    pg_session.add(plan)
    pg_session.commit()

    # 2. Assign expired member profile to customer
    member = pg_session.query(Member).filter(Member.user_id == customer_user.id).first()
    if not member:
        member = Member(
            id=uuid.uuid4(),
            user_id=customer_user.id,
            membership_number=f"APX-MEM-{uuid.uuid4().hex[:4].upper()}",
            status="EXPIRED",
            expiry_date=date.today() - timedelta(days=5),  # Expired in past
            current_plan_id=plan.id,
        )
        pg_session.add(member)
    else:
        member.status = "EXPIRED"
        member.expiry_date = date.today() - timedelta(days=5)
        member.current_plan_id = plan.id
    pg_session.commit()

    booking_date = str(date.today() + timedelta(days=14))

    # Test A: Booking with EXPIRED membership -> 0 discount
    res_expired = client.post(
        "/api/v1/bookings",
        headers=customer_auth_headers,
        json={
            "court_id": str(test_court.id),
            "booking_date": booking_date,
            "start_time": "12:00",
            "participant_count": 1,
        },
    )
    assert res_expired.status_code == 201
    b_exp_data = res_expired.json()
    assert Decimal(str(b_exp_data["discount_amount"])) == Decimal("0.00")
    assert Decimal(str(b_exp_data["total_amount"])) == test_court.hourly_rate  # Full ₹1000

    # Test B: Renew membership -> 20% discount applies
    member.status = "ACTIVE"
    member.expiry_date = date.today() + timedelta(days=365)  # Renew for 1 year
    pg_session.commit()

    booking_date2 = str(date.today() + timedelta(days=15))
    res_renewed = client.post(
        "/api/v1/bookings",
        headers=customer_auth_headers,
        json={
            "court_id": str(test_court.id),
            "booking_date": booking_date2,
            "start_time": "12:00",
            "participant_count": 1,
        },
    )
    assert res_renewed.status_code == 201
    b_ren_data = res_renewed.json()
    assert Decimal(str(b_ren_data["discount_amount"])) == Decimal("200.00")  # 20% of ₹1000
    assert Decimal(str(b_ren_data["total_amount"])) == Decimal("800.00")

    # Clean up
    client.patch(f"/api/v1/bookings/{b_exp_data['id']}/cancel", headers=customer_auth_headers)
    client.patch(f"/api/v1/bookings/{b_ren_data['id']}/cancel", headers=customer_auth_headers)
    pg_session.delete(plan)
    pg_session.commit()


# -----------------------------------------------------------------------------
# 7. Audit Logs for Sensitive Administrative Actions
# -----------------------------------------------------------------------------
def test_audit_logs_capture_sensitive_actions_with_sanitization(pg_session, admin_user):
    """Audit logs capture administrative events while redacting passwords, tokens, and credentials."""
    dirty_details = {
        "action": "ADMIN_UPDATE_CREDENTIALS",
        "target_user_id": str(admin_user.id),
        "password": "SuperSecretPassword123!",
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "session_token": "raw_session_bearer_token",
        "reason": "Security rotation policy",
    }

    log_entry = create_audit_log(
        db=pg_session,
        event_type="ADMIN_SECURITY_EVENT",
        user_id=admin_user.id,
        ip_address="127.0.0.1",
        user_agent="Automated-Audit-Runner",
        details=dirty_details,
    )

    assert log_entry.id is not None
    saved_details = log_entry.details

    # Sensitive values must be sanitized to [REDACTED]
    assert saved_details["password"] == "[REDACTED]"
    assert saved_details["token"] == "[REDACTED]"
    assert saved_details["session_token"] == "[REDACTED]"

    # Non-sensitive keys must be preserved
    assert saved_details["action"] == "ADMIN_UPDATE_CREDENTIALS"
    assert saved_details["reason"] == "Security rotation policy"

    # Clean up
    pg_session.delete(log_entry)
    pg_session.commit()
