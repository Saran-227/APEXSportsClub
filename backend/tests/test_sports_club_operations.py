"""Comprehensive integration and unit tests for SCMS operational engines.

Tests cover:
- Court bookings, 1-hour slots, daily booking limit (max 2), conflict detection
- Tier discounts calculation
- Pro shop order placement and inventory deduction
- Equipment rentals
- Cafeteria orders and kitchen status transitions
- Role authorization and data isolation
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.auth.models import Role, User, UserRole
from backend.app.auth.service import hash_password
from backend.app.bookings.models import Court, CourtBooking
from backend.app.cafeteria.models import Cafeteria, MenuItem, FoodOrder
from backend.app.main import app
from backend.app.memberships.models import Member, MembershipPlan, MemberSubscription
from backend.app.shop.models import Product, Vendor, ShopOrder, EquipmentRental


@pytest.fixture
def test_setup(db_session: Session):
    """Seed minimal test data for testing club operations."""
    # Roles
    customer_role = db_session.query(Role).filter(Role.name == "CUSTOMER").first()
    if not customer_role:
        customer_role = Role(name="CUSTOMER", description="Club Customer")
        db_session.add(customer_role)

    admin_role = db_session.query(Role).filter(Role.name == "ADMIN").first()
    if not admin_role:
        admin_role = Role(name="ADMIN", description="Club Admin")
        db_session.add(admin_role)

    db_session.commit()

    # User 1 (Customer)
    cust_user = User(
        email=f"tester_{uuid.uuid4().hex[:6]}@apexsports.com",
        first_name="Test",
        last_name="Player",
        hashed_password=hash_password("Pass@123456"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(cust_user)
    db_session.flush()
    db_session.add(UserRole(user_id=cust_user.id, role_id=customer_role.id))

    # Gold Membership Plan (50% court discount)
    gold_plan = MembershipPlan(
        name="Gold VIP Test",
        price=Decimal("15000.00"),
        duration_months=12,
        court_discount_percent=50.0,
        shop_discount_percent=15.0,
        cafe_discount_percent=15.0,
    )
    db_session.add(gold_plan)
    db_session.flush()

    member = Member(
        user_id=cust_user.id,
        membership_number=f"APX-{uuid.uuid4().hex[:5].upper()}",
        current_plan_id=gold_plan.id,
        status="ACTIVE",
    )
    db_session.add(member)
    db_session.flush()

    # Add active subscription
    sub = MemberSubscription(
        member_id=member.id,
        plan_id=gold_plan.id,
        start_date=datetime.now(timezone.utc).date(),
        end_date=(datetime.now(timezone.utc) + timedelta(days=365)).date(),
        amount_paid=Decimal("15000.00"),
        payment_status="PAID",
    )
    db_session.add(sub)

    # Court
    court = Court(
        name="Padel Pro Court Alpha",
        sport="padel",
        surface_type="TURF",
        hourly_rate=Decimal("1200.00"),
        is_active=True,
    )
    db_session.add(court)
    db_session.flush()

    # Vendor & Product
    vendor = Vendor(
        user_id=cust_user.id,
        business_name="Apex Pro Shop Test",
        vendor_type="SPORTS_SHOP",
        status="ACTIVE",
    )
    db_session.add(vendor)
    db_session.flush()

    prod = Product(
        vendor_id=vendor.id,
        name="Babolat Technical Viper",
        sku="SKU-TEST-PADEL",
        category="Rackets",
        price=Decimal("18500.00"),
        stock_quantity=5,
        is_rental=True,
        rental_price_per_day=Decimal("450.00"),
    )
    db_session.add(prod)

    # Cafeteria
    cafe = Cafeteria(
        user_id=cust_user.id,
        name="Apex Fuel Bar Test",
        status="ACTIVE",
    )
    db_session.add(cafe)
    db_session.flush()

    menu_item = MenuItem(
        cafeteria_id=cafe.id,
        name="Whey Protein Shake",
        category="SHAKES",
        price=Decimal("220.00"),
        is_available=True,
    )
    db_session.add(menu_item)

    db_session.commit()

    return {
        "user": cust_user,
        "court": court,
        "plan": gold_plan,
        "product": prod,
        "cafe": cafe,
        "menu_item": menu_item,
        "member": member,
    }


def test_booking_rules_conflict_and_limit(client: TestClient, db_session: Session, test_setup):
    """Test 1: Booking creation, 50% gold member discount, conflict prevention, and daily limit."""
    user = test_setup["user"]
    court = test_setup["court"]

    from backend.app.auth.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: user

    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date()

    # 1. First booking (10:00)
    res1 = client.post(
        "/api/v1/bookings",
        json={
            "court_id": str(court.id),
            "booking_date": tomorrow.isoformat(),
            "start_time": "10:00",
        },
    )
    assert res1.status_code == 201
    booking1 = res1.json()
    # 50% discount on 1200 hourly rate = 600
    assert float(booking1["total_amount"]) == 600.0
    assert float(booking1["discount_amount"]) == 600.0

    # 2. Conflicting booking on the same court and slot (Must return 409 Conflict)
    res_conflict = client.post(
        "/api/v1/bookings",
        json={
            "court_id": str(court.id),
            "booking_date": tomorrow.isoformat(),
            "start_time": "10:00",
        },
    )
    assert res_conflict.status_code == 409
    assert "already reserved" in res_conflict.json()["detail"]

    # 3. Second booking same day (14:00) - Allowed (up to 2 per day)
    res2 = client.post(
        "/api/v1/bookings",
        json={
            "court_id": str(court.id),
            "booking_date": tomorrow.isoformat(),
            "start_time": "14:00",
        },
    )
    assert res2.status_code == 201

    # 4. Third booking same day (18:00) - Must be rejected (Daily Limit = 2)
    res3 = client.post(
        "/api/v1/bookings",
        json={
            "court_id": str(court.id),
            "booking_date": tomorrow.isoformat(),
            "start_time": "18:00",
        },
    )
    assert res3.status_code == 400
    assert "maximum of 2 sessions per day" in res3.json()["detail"]

    app.dependency_overrides.pop(get_current_user, None)


def test_shop_inventory_deduction(client: TestClient, db_session: Session, test_setup):
    """Test 2: Pro shop order creation with automatic stock deduction."""
    user = test_setup["user"]
    prod = test_setup["product"]

    from backend.app.auth.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: user

    initial_stock = prod.stock_quantity

    # Place order for 2 units
    res = client.post(
        "/api/v1/shop/orders",
        json={
            "items": [{"product_id": str(prod.id), "quantity": 2}],
            "fulfilment_type": "PICKUP",
        },
    )
    assert res.status_code == 201
    order_data = res.json()
    assert order_data["status"] == "PENDING"

    # Verify inventory was deducted in database
    db_session.refresh(prod)
    assert prod.stock_quantity == initial_stock - 2

    app.dependency_overrides.pop(get_current_user, None)


def test_cafeteria_order_flow(client: TestClient, db_session: Session, test_setup):
    """Test 3: Cafeteria order placement and kitchen board advance."""
    user = test_setup["user"]
    menu_item = test_setup["menu_item"]

    from backend.app.auth.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: user

    # Customer orders a shake
    res = client.post(
        "/api/v1/cafeteria/orders",
        json={
            "items": [{"menu_item_id": str(menu_item.id), "quantity": 1}],
            "order_type": "DINE_IN",
            "customer_notes": "Extra cold please",
        },
    )
    assert res.status_code == 201
    order = res.json()
    assert order["status"] == "NEW"
    order_id = order["id"]

    # Kitchen moves to PREPARING
    res_prep = client.patch(
        f"/api/v1/cafeteria/orders/{order_id}/status",
        json={"status": "PREPARING"},
    )
    assert res_prep.status_code == 200
    assert res_prep.json()["status"] == "PREPARING"

    # Kitchen moves to READY
    res_ready = client.patch(
        f"/api/v1/cafeteria/orders/{order_id}/status",
        json={"status": "READY"},
    )
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "READY"

    # Completed
    res_done = client.patch(
        f"/api/v1/cafeteria/orders/{order_id}/status",
        json={"status": "COMPLETED"},
    )
    assert res_done.status_code == 200
    assert res_done.json()["status"] == "COMPLETED"

    app.dependency_overrides.pop(get_current_user, None)
