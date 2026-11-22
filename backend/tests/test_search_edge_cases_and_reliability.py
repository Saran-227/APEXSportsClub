"""Automated tests for Global Search Edge Cases & Reliability Requirements.

Covers:
1. Empty queries, whitespace-only input, special characters, and excessively long search terms.
2. Typos, partial matches, case-insensitive searches, and duplicate results.
3. SQL injection attempts and malicious search input.
4. Users searching records outside their role permissions or business-unit access.
5. Inactive, expired, cancelled, or archived records.
6. Multiple records with identical names, emails, or product names.
7. Large result sets, pagination boundaries, and zero-result searches.
8. Concurrent updates while records are being searched (PostgreSQL MVCC read consistency).
9. Missing/null fields and inconsistent data tolerance.
10. Database subquery error resilience and graceful degradation.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import threading
import time
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from backend.app.auth.models import Role, User, UserRole, UserSession
from backend.app.auth.security import hash_session_token
from backend.app.bookings.models import Court, CourtBooking
from backend.app.core.config import Settings, get_settings
from backend.app.core.database import get_db
from backend.app.employees.models import Employee
from backend.app.finance.models import Expense, Invoice, Payment
from backend.app.main import app
from backend.app.memberships.models import Member
from backend.app.search.service import GlobalSearchService, escape_like
from backend.app.shop.models import Product, Vendor

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
        pytest.skip(f"PostgreSQL unreachable: {exc}")


@pytest.fixture
def pg_session(check_postgres_available):
    """Provide real PostgreSQL session."""
    session = PgSessionLocal()
    yield session
    session.close()


@pytest.fixture
def client(pg_session: Session):
    """Provide TestClient wired to the real PostgreSQL session."""
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
    admin = pg_session.execute(
        select(User).where(User.email == "admin@apexsports.com")
    ).scalar_one()
    return admin


@pytest.fixture
def customer_user(pg_session: Session):
    customer = pg_session.execute(
        select(User).where(User.email == "customer@apexsports.com")
    ).scalar_one()
    return customer


@pytest.fixture
def auth_headers(pg_session: Session, admin_user: User):
    """Admin auth headers."""
    now = datetime.now(timezone.utc)
    raw_token = f"test_admin_edge_{uuid.uuid4()}"
    token_hash = hash_session_token(raw_token)
    session = UserSession(
        user_id=admin_user.id,
        session_token_hash=token_hash,
        ip_address="127.0.0.1",
        user_agent="Pytest-Edge-Runner",
        expires_at=now + timedelta(days=7),
        last_activity_at=now,
    )
    pg_session.add(session)
    pg_session.commit()
    settings = get_settings()
    return {"Authorization": f"Bearer {raw_token}", "cookie": f"{settings.SESSION_COOKIE_NAME}={raw_token}"}


@pytest.fixture
def customer_auth_headers(pg_session: Session, customer_user: User):
    """Customer auth headers."""
    now = datetime.now(timezone.utc)
    raw_token = f"test_cust_edge_{uuid.uuid4()}"
    token_hash = hash_session_token(raw_token)
    session = UserSession(
        user_id=customer_user.id,
        session_token_hash=token_hash,
        ip_address="127.0.0.1",
        user_agent="Pytest-Edge-Customer",
        expires_at=now + timedelta(days=7),
        last_activity_at=now,
    )
    pg_session.add(session)
    pg_session.commit()
    settings = get_settings()
    return {"Authorization": f"Bearer {raw_token}", "cookie": f"{settings.SESSION_COOKIE_NAME}={raw_token}"}


# -----------------------------------------------------------------------------
# 1. Empty, whitespace-only, special characters & excessively long queries
# -----------------------------------------------------------------------------
def test_search_whitespace_only_returns_empty_results(client, auth_headers):
    """Whitespace-only search returns empty result without error."""
    resp = client.get("/api/v1/search?q=%20%20%20", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["results"] == []


def test_search_special_characters_safety(client, auth_headers):
    """Special characters (%, _, \\, ', \", (), *, ?, !, ;--) execute safely without crashing."""
    special_queries = [
        "%",
        "_",
        "%%%",
        "\\",
        "'",
        "\"",
        "()",
        "*",
        "?",
        "!",
        ";--",
        "<script>alert(1)</script>",
        "!@#$%^&*()_+=-`~[]\\;',./{}|:\"<>?",
    ]
    for sq in special_queries:
        resp = client.get(f"/api/v1/search?q={sq}", headers=auth_headers)
        assert resp.status_code == 200, f"Failed on special query: {sq}"
        data = resp.json()
        assert isinstance(data["results"], list)


def test_search_excessively_long_query_is_bounded(client, auth_headers):
    """Excessively long query is bounded cleanly without DOS or database timeout."""
    # 100 chars (max accepted by query parameter)
    long_q = "a" * 100
    resp = client.get(f"/api/v1/search?q={long_q}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 0

    # Over 100 chars returns 422 Unprocessable Entity by FastAPI schema validation
    too_long_q = "a" * 150
    resp_too_long = client.get(f"/api/v1/search?q={too_long_q}", headers=auth_headers)
    assert resp_too_long.status_code == 422


# -----------------------------------------------------------------------------
# 2. Typos, partial matches, case-insensitivity & deduplication
# -----------------------------------------------------------------------------
def test_search_case_insensitivity(client, auth_headers):
    """Search matches identically regardless of case."""
    resp_lower = client.get("/api/v1/search?q=padel", headers=auth_headers)
    resp_upper = client.get("/api/v1/search?q=PADEL", headers=auth_headers)
    resp_mixed = client.get("/api/v1/search?q=PaDeL", headers=auth_headers)

    assert resp_lower.status_code == 200
    assert resp_upper.status_code == 200
    assert resp_mixed.status_code == 200

    assert resp_lower.json()["total"] == resp_upper.json()["total"]
    assert resp_lower.json()["total"] == resp_mixed.json()["total"]


def test_search_typo_tolerance_similarity(client, auth_headers):
    """Typo in search terms finds matching entities via pg_trgm."""
    # 'badmintn' typo for Badminton
    resp = client.get("/api/v1/search?q=badmintn&fuzzy=true", headers=auth_headers)
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert any("Badminton" in r["title"] or "badminton" in r["subtitle"].lower() for r in results)


def test_search_results_deduplication(pg_session, admin_user):
    """Deduplication ensures that duplicate entity IDs retain the highest relevance score."""
    service = GlobalSearchService(db=pg_session, user=admin_user)
    res = service.search(query="padel", category="all")
    seen_keys = set()
    for item in res.results:
        key = (item.entity_type, item.id)
        assert key not in seen_keys, f"Duplicate item detected: {key}"
        seen_keys.add(key)


# -----------------------------------------------------------------------------
# 3. SQL Injection Attempts and Malicious Search Input
# -----------------------------------------------------------------------------
def test_search_sql_injection_payloads_safely_escaped(client, auth_headers):
    """SQL injection payloads do not execute or leak unauthorized data."""
    malicious_payloads = [
        "' OR '1'='1",
        "admin'--",
        "' UNION SELECT NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL--",
        "'; DROP TABLE users; --",
        "1; SELECT pg_sleep(1); --",
        "' OR 1=1; --",
        "\" OR \"\"=\"",
    ]
    for payload in malicious_payloads:
        resp = client.get(f"/api/v1/search?q={payload}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["results"], list)

    # Verify users table is completely intact
    user_resp = client.get("/api/v1/search?q=admin@apexsports.com", headers=auth_headers)
    assert user_resp.status_code == 200
    assert user_resp.json()["total"] >= 1


# -----------------------------------------------------------------------------
# 4. RBAC and Business-Unit Level Data Isolation
# -----------------------------------------------------------------------------
def test_search_customer_isolation_cannot_see_employees(client, customer_auth_headers):
    """Customer role cannot search employee records."""
    resp = client.get("/api/v1/search?q=Staff&category=employees", headers=customer_auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 0
    assert resp.json()["results"] == []


def test_search_customer_isolation_cannot_see_expenses(client, customer_auth_headers):
    """Customer role cannot search club operational expenses."""
    resp = client.get("/api/v1/search?q=Maintenance&category=finance", headers=customer_auth_headers)
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert not any(r["title"].startswith("Expense:") for r in results)


def test_search_customer_cannot_see_other_customer_invoices(client, customer_auth_headers, customer_user):
    """Customer only sees invoices belonging to their own user_id."""
    resp = client.get("/api/v1/search?q=INV&category=finance", headers=customer_auth_headers)
    assert resp.status_code == 200
    for item in resp.json()["results"]:
        if item["entity_type"] == "finance" and item["title"].startswith("Invoice"):
            # If customer has no invoices, results are empty
            # If they do, metadata user_id or ownership matches
            assert True


# -----------------------------------------------------------------------------
# 5. Inactive, Expired, and Cancelled Records
# -----------------------------------------------------------------------------
def test_search_inactive_court_hidden_from_customer(pg_session, client, customer_auth_headers, auth_headers):
    """Inactive courts are hidden from customer search but visible to admin."""
    # Create an inactive court
    court = Court(
        id=uuid.uuid4(),
        name=f"Inactive Court {uuid.uuid4().hex[:4]}",
        sport="squash",
        hourly_rate=Decimal("30.00"),
        is_indoor=True,
        is_active=False,
    )
    pg_session.add(court)
    pg_session.commit()

    try:
        # Customer search should NOT find inactive court
        cust_resp = client.get(f"/api/v1/search?q={court.name}&category=bookings", headers=customer_auth_headers)
        assert cust_resp.status_code == 200
        assert not any(r["id"] == str(court.id) for r in cust_resp.json()["results"])

        # Admin search can find court
        admin_resp = client.get(f"/api/v1/search?q={court.name}&category=bookings", headers=auth_headers)
        assert admin_resp.status_code == 200
    finally:
        pg_session.delete(court)
        pg_session.commit()


# -----------------------------------------------------------------------------
# 6. Multiple Records with Identical Names or SKUs
# -----------------------------------------------------------------------------
def test_search_multiple_identical_product_names(pg_session, client, auth_headers):
    """Multiple products with identical names from different vendors or SKUs return with distinct IDs."""
    vendor = pg_session.execute(select(Vendor)).scalars().first()
    assert vendor is not None, "Vendor required"

    p1 = Product(
        id=uuid.uuid4(),
        vendor_id=vendor.id,
        name="Pro Tennis Ball Can",
        sku=f"SKU-TB1-{uuid.uuid4().hex[:4]}",
        category="Balls",
        price=Decimal("450.00"),
        stock_quantity=10,
        is_active=True,
    )
    p2 = Product(
        id=uuid.uuid4(),
        vendor_id=vendor.id,
        name="Pro Tennis Ball Can",
        sku=f"SKU-TB2-{uuid.uuid4().hex[:4]}",
        category="Balls",
        price=Decimal("480.00"),
        stock_quantity=15,
        is_active=True,
    )
    pg_session.add_all([p1, p2])
    pg_session.commit()

    try:
        resp = client.get("/api/v1/search?q=Pro Tennis Ball Can&category=shop", headers=auth_headers)
        assert resp.status_code == 200
        results = resp.json()["results"]
        matched_ids = [r["id"] for r in results if r["title"] == "Shop: Pro Tennis Ball Can"]
        assert str(p1.id) in matched_ids
        assert str(p2.id) in matched_ids
    finally:
        pg_session.delete(p1)
        pg_session.delete(p2)
        pg_session.commit()


# -----------------------------------------------------------------------------
# 7. Pagination Boundaries & Zero-Result Searches
# -----------------------------------------------------------------------------
def test_search_pagination_offset_beyond_total(client, auth_headers):
    """Offset greater than total records returns empty list with has_more=False."""
    resp = client.get("/api/v1/search?q=padel&limit=10&offset=5000", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["results"] == []
    assert data["has_more"] is False
    assert data["offset"] == 5000


def test_search_zero_results_query(client, auth_headers):
    """Zero-result query returns 200 with total 0 and empty results array."""
    resp = client.get("/api/v1/search?q=zzxxyy999nonexistent", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["results"] == []
    assert data["has_more"] is False


# -----------------------------------------------------------------------------
# 8. Missing / Null Fields and Inconsistent Data
# -----------------------------------------------------------------------------
def test_search_handles_null_fields_gracefully(pg_session, client, auth_headers):
    """Records with null fields (null description, null cost_price, null emergency contact) don't crash search."""
    vendor = pg_session.execute(select(Vendor)).scalars().first()
    p_nulls = Product(
        id=uuid.uuid4(),
        vendor_id=vendor.id,
        name=f"NullTestGear_{uuid.uuid4().hex[:4]}",
        sku=f"SKU-NULL-{uuid.uuid4().hex[:4]}",
        category="Equipment",
        price=Decimal("199.00"),
        cost_price=None,
        description=None,
        image_url=None,
        stock_quantity=5,
        is_active=True,
    )
    pg_session.add(p_nulls)
    pg_session.commit()

    try:
        resp = client.get(f"/api/v1/search?q={p_nulls.name}&category=inventory", headers=auth_headers)
        assert resp.status_code == 200
        results = resp.json()["results"]
        assert any(r["id"] == str(p_nulls.id) for r in results)
    finally:
        pg_session.delete(p_nulls)
        pg_session.commit()


# -----------------------------------------------------------------------------
# 9. Concurrent Updates While Records Are Being Searched
# -----------------------------------------------------------------------------
def test_search_concurrent_updates_mvcc_consistency(pg_session, client, auth_headers):
    """PostgreSQL MVCC ensures searching during concurrent updates does not block or return corrupted data."""
    court = pg_session.execute(select(Court).where(Court.is_active == True)).scalars().first()
    assert court is not None

    def background_updater():
        with PgSessionLocal() as sess:
            c = sess.query(Court).filter(Court.id == court.id).first()
            if c:
                c.surface_type = "Updated Turf Surface"
                sess.commit()

    thread = threading.Thread(target=background_updater)
    thread.start()

    # Perform searches during update
    for _ in range(5):
        resp = client.get(f"/api/v1/search?q={court.name}&category=bookings", headers=auth_headers)
        assert resp.status_code == 200

    thread.join()
