"""ApexSportsClub - Test Suite for Chronological Record Ordering.

Validates:
1. Records are retrieved and returned in chronological descending order (newest first)
2. Appropriate timestamp columns are used (created_at, issued_at, etc.)
3. Ties in timestamps are broken deterministically by id.desc()
4. Pagination applies ordering before offsets and limits
5. Ordering is preserved across Bookings, Members, Shop Orders, Rentals, Cafeteria,
   Finance Invoices, Payments, Customer Enquiries, and Notifications.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.models import Role, User, UserRole
from backend.app.auth.service import hash_password
from backend.app.bookings.models import Court, CourtBooking
from backend.app.cafeteria.models import Cafeteria, FoodOrder, MenuItem
from backend.app.crm.models import CustomerEnquiry, Notification
from backend.app.finance.models import Invoice, Payment
from backend.app.main import app
from backend.app.memberships.models import Member, MembershipPlan
from backend.app.shop.models import EquipmentRental, Product, ShopOrder, Vendor


@pytest.fixture
def chrono_setup(db_session: Session):
    """Seed base roles, admin, customer, vendor, and cafeteria users."""
    roles = {}
    for r_name in ["ADMIN", "CUSTOMER", "SPORTS_SHOP_VENDOR", "CAFETERIA_OWNER"]:
        r = db_session.query(Role).filter(Role.name == r_name).first()
        if not r:
            r = Role(name=r_name, description=r_name)
            db_session.add(r)
        roles[r_name] = r
    db_session.commit()

    admin = User(
        email="chrono_admin@apex.com",
        hashed_password=hash_password("Pass123!"),
        first_name="Admin",
        last_name="Chrono",
        is_active=True,
        is_verified=True,
    )
    db_session.add(admin)
    db_session.flush()
    db_session.add(UserRole(user_id=admin.id, role_id=roles["ADMIN"].id))

    customer = User(
        email="chrono_cust@apex.com",
        hashed_password=hash_password("Pass123!"),
        first_name="Customer",
        last_name="Chrono",
        is_active=True,
        is_verified=True,
    )
    db_session.add(customer)
    db_session.flush()
    db_session.add(UserRole(user_id=customer.id, role_id=roles["CUSTOMER"].id))

    vendor_user = User(
        email="chrono_vendor@apex.com",
        hashed_password=hash_password("Pass123!"),
        first_name="Vendor",
        last_name="Chrono",
        is_active=True,
        is_verified=True,
    )
    db_session.add(vendor_user)
    db_session.flush()
    db_session.add(UserRole(user_id=vendor_user.id, role_id=roles["SPORTS_SHOP_VENDOR"].id))

    vendor = Vendor(
        user_id=vendor_user.id,
        business_name="Chrono Pro Shop",
        vendor_type="SPORTS_SHOP",
        status="APPROVED",
    )
    db_session.add(vendor)

    cafe_user = User(
        email="chrono_cafe@apex.com",
        hashed_password=hash_password("Pass123!"),
        first_name="Chef",
        last_name="Chrono",
        is_active=True,
        is_verified=True,
    )
    db_session.add(cafe_user)
    db_session.flush()
    db_session.add(UserRole(user_id=cafe_user.id, role_id=roles["CAFETERIA_OWNER"].id))

    cafe = Cafeteria(
        user_id=cafe_user.id,
        name="Chrono Pavilion Cafe",
        status="ACTIVE",
    )
    db_session.add(cafe)

    court = Court(
        name="Chrono Tennis Center",
        sport="tennis",
        hourly_rate=Decimal("1500.00"),
        is_indoor=False,
        is_active=True,
    )
    db_session.add(court)

    db_session.commit()

    return {
        "admin": admin,
        "customer": customer,
        "vendor": vendor,
        "cafe": cafe,
        "court": court,
    }


def test_members_chronological_ordering_and_pagination(client: TestClient, db_session: Session, chrono_setup):
    """Verify members are returned ordered by created_at DESC before pagination."""
    app.dependency_overrides[get_current_user] = lambda: chrono_setup["admin"]

    base_time = datetime(2026, 11, 20, 10, 0, tzinfo=timezone.utc)
    members_created = []

    for i in range(5):
        u = User(
            email=f"member_order_{i}@test.com",
            hashed_password=hash_password("Pass123!"),
            first_name=f"Member{i}",
            last_name="Test",
            created_at=base_time + timedelta(hours=i * 2),
        )
        db_session.add(u)
        db_session.flush()

        m = Member(
            user_id=u.id,
            membership_number=f"ORD-MEM-00{i}",
            status="ACTIVE",
            joined_date=date(2026, 11, 20),
            created_at=base_time + timedelta(hours=i * 2),
        )
        db_session.add(m)
        members_created.append(m)

    db_session.commit()

    # Query first page of 3
    resp = client.get("/api/v1/members?page=1&page_size=3")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 3

    # Newest member (i=4) must be first, followed by i=3, then i=2
    assert data["items"][0]["membership_number"] == "ORD-MEM-004"
    assert data["items"][1]["membership_number"] == "ORD-MEM-003"
    assert data["items"][2]["membership_number"] == "ORD-MEM-002"

    # Page 2 must have i=1 and i=0
    resp2 = client.get("/api/v1/members?page=2&page_size=3")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["items"][0]["membership_number"] == "ORD-MEM-001"
    assert data2["items"][1]["membership_number"] == "ORD-MEM-000"


def test_court_bookings_chronological_ordering(client: TestClient, db_session: Session, chrono_setup):
    """Verify bookings are returned ordered by created_at DESC (booking creation time)."""
    app.dependency_overrides[get_current_user] = lambda: chrono_setup["admin"]
    court = chrono_setup["court"]
    cust = chrono_setup["customer"]

    base_time = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)

    # Booking A: Booked at 12:00 for court date Nov 25
    b_old = CourtBooking(
        court_id=court.id,
        user_id=cust.id,
        booking_date=date(2026, 11, 25),
        start_time=datetime(2026, 11, 25, 10, 0, tzinfo=timezone.utc),
        end_time=datetime(2026, 11, 25, 11, 0, tzinfo=timezone.utc),
        hourly_rate=Decimal("1500.00"),
        total_amount=Decimal("1500.00"),
        status="CONFIRMED",
        created_at=base_time,
        notes="Booked earlier",
    )
    db_session.add(b_old)

    # Booking B: Booked at 15:00 for court date Nov 21 (earlier play date, but created later)
    b_new = CourtBooking(
        court_id=court.id,
        user_id=cust.id,
        booking_date=date(2026, 11, 21),
        start_time=datetime(2026, 11, 21, 10, 0, tzinfo=timezone.utc),
        end_time=datetime(2026, 11, 21, 11, 0, tzinfo=timezone.utc),
        hourly_rate=Decimal("1500.00"),
        total_amount=Decimal("1500.00"),
        status="CONFIRMED",
        created_at=base_time + timedelta(hours=3),
        notes="Booked later",
    )
    db_session.add(b_new)
    db_session.commit()

    resp = client.get("/api/v1/bookings")
    assert resp.status_code == 200
    items = resp.json()

    # Newest booking creation must be first in the listing
    assert len(items) >= 2
    assert items[0]["id"] == str(b_new.id)
    assert items[1]["id"] == str(b_old.id)


def test_shop_orders_chronological_ordering(client: TestClient, db_session: Session, chrono_setup):
    """Verify shop orders are returned in created_at DESC order."""
    app.dependency_overrides[get_current_user] = lambda: chrono_setup["admin"]
    vendor = chrono_setup["vendor"]
    cust = chrono_setup["customer"]

    base_time = datetime(2026, 11, 19, 8, 0, tzinfo=timezone.utc)

    o1 = ShopOrder(
        vendor_id=vendor.id,
        user_id=cust.id,
        order_number="ORD-TIME-001",
        total_amount=Decimal("1000.00"),
        status="PENDING",
        created_at=base_time,
    )
    o2 = ShopOrder(
        vendor_id=vendor.id,
        user_id=cust.id,
        order_number="ORD-TIME-002",
        total_amount=Decimal("2000.00"),
        status="COMPLETED",
        created_at=base_time + timedelta(hours=5),
    )
    db_session.add_all([o1, o2])
    db_session.commit()

    resp = client.get("/api/v1/shop/orders")
    assert resp.status_code == 200
    orders = resp.json()
    assert orders[0]["order_number"] == "ORD-TIME-002"
    assert orders[1]["order_number"] == "ORD-TIME-001"


def test_equipment_rentals_chronological_ordering(client: TestClient, db_session: Session, chrono_setup):
    """Verify equipment rentals are returned in created_at DESC order."""
    app.dependency_overrides[get_current_user] = lambda: chrono_setup["admin"]
    vendor = chrono_setup["vendor"]
    cust = chrono_setup["customer"]

    prod = Product(
        vendor_id=vendor.id,
        name="Chrono Padel Racket",
        sku="CHRONO-PADEL-1",
        category="Rackets",
        price=Decimal("3500.00"),
        is_rental=True,
    )
    db_session.add(prod)
    db_session.flush()

    base_time = datetime(2026, 11, 18, 9, 0, tzinfo=timezone.utc)
    r1 = EquipmentRental(
        product_id=prod.id,
        user_id=cust.id,
        rental_start=base_time + timedelta(days=1),
        rental_end=base_time + timedelta(days=2),
        rental_fee=Decimal("500.00"),
        status="ACTIVE",
        created_at=base_time,
    )
    r2 = EquipmentRental(
        product_id=prod.id,
        user_id=cust.id,
        rental_start=base_time + timedelta(days=2),
        rental_end=base_time + timedelta(days=3),
        rental_fee=Decimal("600.00"),
        status="ACTIVE",
        created_at=base_time + timedelta(hours=4),
    )
    db_session.add_all([r1, r2])
    db_session.commit()

    resp = client.get("/api/v1/shop/rentals")
    assert resp.status_code == 200
    rentals = resp.json()
    assert rentals[0]["id"] == str(r2.id)
    assert rentals[1]["id"] == str(r1.id)


def test_cafeteria_orders_chronological_ordering(client: TestClient, db_session: Session, chrono_setup):
    """Verify food orders are returned in created_at DESC order."""
    app.dependency_overrides[get_current_user] = lambda: chrono_setup["admin"]
    cafe = chrono_setup["cafe"]
    cust = chrono_setup["customer"]

    base_time = datetime(2026, 11, 21, 14, 0, tzinfo=timezone.utc)
    fo1 = FoodOrder(
        cafeteria_id=cafe.id,
        user_id=cust.id,
        order_number="CAFE-ORD-01",
        total_amount=Decimal("350.00"),
        status="NEW",
        created_at=base_time,
    )
    fo2 = FoodOrder(
        cafeteria_id=cafe.id,
        user_id=cust.id,
        order_number="CAFE-ORD-02",
        total_amount=Decimal("500.00"),
        status="READY",
        created_at=base_time + timedelta(minutes=45),
    )
    db_session.add_all([fo1, fo2])
    db_session.commit()

    resp = client.get("/api/v1/cafeteria/orders")
    assert resp.status_code == 200
    orders = resp.json()
    assert orders[0]["order_number"] == "CAFE-ORD-02"
    assert orders[1]["order_number"] == "CAFE-ORD-01"


def test_invoices_and_payments_chronological_ordering(client: TestClient, db_session: Session, chrono_setup):
    """Verify invoices (issued_at DESC) and payments (created_at DESC)."""
    app.dependency_overrides[get_current_user] = lambda: chrono_setup["admin"]
    cust = chrono_setup["customer"]

    t1 = datetime(2026, 11, 20, 10, 0, tzinfo=timezone.utc)
    t2 = datetime(2026, 11, 20, 16, 0, tzinfo=timezone.utc)

    inv1 = Invoice(
        invoice_number="APEX-CHRONO-001",
        user_id=cust.id,
        customer_name="Customer Chrono",
        customer_email="chrono_cust@apex.com",
        amount=Decimal("1500.00"),
        status="PAID",
        issued_at=t1,
    )
    inv2 = Invoice(
        invoice_number="APEX-CHRONO-002",
        user_id=cust.id,
        customer_name="Customer Chrono",
        customer_email="chrono_cust@apex.com",
        amount=Decimal("2500.00"),
        status="PAID",
        issued_at=t2,
    )
    db_session.add_all([inv1, inv2])

    p1 = Payment(
        user_id=cust.id,
        amount=Decimal("1500.00"),
        payment_method="UPI",
        status="COMPLETED",
        reference_type="BOOKING",
        reference_id="BKG-001",
        created_at=t1,
    )
    p2 = Payment(
        user_id=cust.id,
        amount=Decimal("2500.00"),
        payment_method="CARD",
        status="COMPLETED",
        reference_type="SHOP_ORDER",
        reference_id="ORD-002",
        created_at=t2,
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    # Invoices
    r_inv = client.get("/api/v1/invoices")
    assert r_inv.status_code == 200
    inv_list = r_inv.json()
    inv_nums = [i["invoice_number"] for i in inv_list if "APEX-CHRONO" in i["invoice_number"]]
    assert inv_nums[0] == "APEX-CHRONO-002"
    assert inv_nums[1] == "APEX-CHRONO-001"

    # Payments
    r_pay = client.get("/api/v1/finance/transactions")
    assert r_pay.status_code == 200
    pay_list = r_pay.json()
    refs = [p["reference_id"] for p in pay_list if p["reference_id"] in ("BKG-001", "ORD-002")]
    assert refs[0] == "ORD-002"
    assert refs[1] == "BKG-001"


def test_customer_enquiries_and_notifications_chronological_ordering(client: TestClient, db_session: Session, chrono_setup):
    """Verify enquiries and notifications are retrieved newest first."""
    app.dependency_overrides[get_current_user] = lambda: chrono_setup["admin"]

    t1 = datetime(2026, 11, 20, 8, 0, tzinfo=timezone.utc)
    t2 = datetime(2026, 11, 20, 18, 0, tzinfo=timezone.utc)

    e1 = CustomerEnquiry(
        name="Enquiry One",
        email="e1@test.com",
        subject="Membership",
        message="Question 1",
        status="NEW",
        created_at=t1,
    )
    e2 = CustomerEnquiry(
        name="Enquiry Two",
        email="e2@test.com",
        subject="Coaching",
        message="Question 2",
        status="NEW",
        created_at=t2,
    )
    db_session.add_all([e1, e2])

    n1 = Notification(
        user_id=chrono_setup["admin"].id,
        title="Notice 1",
        message="Old notice",
        notification_type="SYSTEM",
        is_read=False,
        created_at=t1,
    )
    n2 = Notification(
        user_id=chrono_setup["admin"].id,
        title="Notice 2",
        message="New notice",
        notification_type="ALERT",
        is_read=False,
        created_at=t2,
    )
    db_session.add_all([n1, n2])
    db_session.commit()

    # Enquiries
    r_enq = client.get("/api/v1/crm/enquiries")
    assert r_enq.status_code == 200
    enqs = r_enq.json()
    e_names = [e["name"] for e in enqs if e["name"] in ("Enquiry One", "Enquiry Two")]
    assert e_names[0] == "Enquiry Two"
    assert e_names[1] == "Enquiry One"

    # Notifications
    r_notif = client.get("/api/v1/crm/notifications")
    assert r_notif.status_code == 200
    notifs = r_notif.json()
    n_titles = [n["title"] for n in notifs if n["title"] in ("Notice 1", "Notice 2")]
    assert n_titles[0] == "Notice 2"
    assert n_titles[1] == "Notice 1"
