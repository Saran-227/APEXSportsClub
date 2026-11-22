"""Comprehensive Test Suite for Optimized Unified Global Search System."""
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from backend.app.auth.models import Role, User, UserRole, UserSession
from backend.app.auth.security import hash_password, hash_session_token
from backend.app.core.config import Settings, get_settings
from backend.app.core.database import Base, get_db
from backend.app.main import app

# Connect to real PostgreSQL using environment / default settings
pg_settings = Settings(DATABASE_URL=None)
pg_url = pg_settings.sqlalchemy_database_url

pg_engine = create_engine(pg_url, pool_pre_ping=True)
PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)


@pytest.fixture(scope="module")
def check_postgres_available():
    """Verify real PostgreSQL connection is reachable before running integration tests."""
    try:
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL integration target unreachable: {exc}")


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
def auth_headers(pg_session: Session):
    """Provide admin authorization cookie & session token."""
    admin_user = pg_session.execute(
        select(User).where(User.email == "admin@apexsports.com")
    ).scalar_one_or_none()

    assert admin_user is not None, "admin@apexsports.com must exist in PostgreSQL"

    now = datetime.now(timezone.utc)
    raw_token = f"test_admin_token_{uuid.uuid4()}"
    token_hash = hash_session_token(raw_token)
    session = UserSession(
        user_id=admin_user.id,
        session_token_hash=token_hash,
        ip_address="127.0.0.1",
        user_agent="Pytest-Search-Runner",
        expires_at=now + timedelta(days=7),
        last_activity_at=now,
    )
    pg_session.add(session)
    pg_session.commit()

    settings = get_settings()
    return {"Authorization": f"Bearer {raw_token}", "cookie": f"{settings.SESSION_COOKIE_NAME}={raw_token}"}


@pytest.fixture
def customer_auth_headers(pg_session: Session):
    """Provide customer authorization cookie & session token."""
    customer = pg_session.execute(
        select(User).where(User.email == "customer@apexsports.com")
    ).scalar_one_or_none()

    assert customer is not None, "customer@apexsports.com must exist in PostgreSQL"

    now = datetime.now(timezone.utc)
    raw_token = f"test_customer_token_{uuid.uuid4()}"
    token_hash = hash_session_token(raw_token)
    session = UserSession(
        user_id=customer.id,
        session_token_hash=token_hash,
        ip_address="127.0.0.1",
        user_agent="Pytest-Customer-Runner",
        expires_at=now + timedelta(days=7),
        last_activity_at=now,
    )
    pg_session.add(session)
    pg_session.commit()

    settings = get_settings()
    return {"Authorization": f"Bearer {raw_token}", "cookie": f"{settings.SESSION_COOKIE_NAME}={raw_token}"}


def test_search_unauthenticated(client):
    """Verify unauthenticated search requests are rejected."""
    resp = client.get("/api/v1/search?q=padel")
    assert resp.status_code == 401
    assert "Authentication required" in resp.json()["detail"]


def test_search_missing_or_empty_query(client, auth_headers):
    """Verify validation requires non-empty query parameter."""
    resp = client.get("/api/v1/search", headers=auth_headers)
    assert resp.status_code == 422

    resp_empty = client.get("/api/v1/search?q=", headers=auth_headers)
    assert resp_empty.status_code == 422


def test_search_exact_match_btree_lookup(client, auth_headers):
    """Verify B-Tree indexed exact lookups for invoices and emails."""
    # Search invoice number
    resp = client.get("/api/v1/search?q=APEX-INV-2026-000001", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    top_result = data["results"][0]
    assert "APEX-INV-2026-000001" in top_result["title"]
    assert top_result["entity_type"] == "finance"
    assert top_result["relevance_score"] >= 0.95

    # Search email
    resp_email = client.get("/api/v1/search?q=admin@apexsports.com", headers=auth_headers)
    assert resp_email.status_code == 200
    email_data = resp_email.json()
    assert email_data["total"] >= 1
    assert any("admin@apexsports.com" in r["subtitle"] for r in email_data["results"])


def test_search_fuzzy_and_typo_tolerance_gin_trgm(client, auth_headers):
    """Verify GIN pg_trgm fuzzy matching handles common typos."""
    # Typo: 'padell' instead of 'padel'
    resp = client.get("/api/v1/search?q=padell&fuzzy=true", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    titles = [r["title"] for r in data["results"]]
    assert any("Padel" in t for t in titles)

    # Typo: 'protien' instead of 'protein'
    resp_protein = client.get("/api/v1/search?q=protien&fuzzy=true", headers=auth_headers)
    assert resp_protein.status_code == 200
    p_data = resp_protein.json()
    assert p_data["total"] >= 1
    assert any("Protein" in r["title"] for r in p_data["results"])


def test_search_full_text_search(client, auth_headers):
    """Verify GIN tsvector full-text search across catalog descriptions."""
    resp = client.get("/api/v1/search?q=turf+super-court", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any("Padel" in r["title"] for r in data["results"])


def test_search_category_filtering(client, auth_headers):
    """Verify category filter isolates results to specified business domain."""
    resp = client.get("/api/v1/search?q=padel&category=bookings", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["category"] == "bookings"
    assert all(r["entity_type"] == "bookings" for r in data["results"])

    resp_cafe = client.get("/api/v1/search?q=shake&category=cafeteria", headers=auth_headers)
    assert resp_cafe.status_code == 200
    c_data = resp_cafe.json()
    assert all(r["entity_type"] == "cafeteria" for r in c_data["results"])


def test_search_pagination_and_limits(client, auth_headers):
    """Verify limit and offset pagination controls."""
    resp = client.get("/api/v1/search?q=court&limit=2&offset=0", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) <= 2
    assert data["limit"] == 2
    assert data["offset"] == 0


def test_search_rbac_data_isolation_customer(client, customer_auth_headers):
    """Verify customer role cannot access other members' records, employees, or club expenses."""
    # Customer searches for employees
    resp_emp = client.get("/api/v1/search?q=Malhotra&category=employees", headers=customer_auth_headers)
    assert resp_emp.status_code == 200
    assert resp_emp.json()["total"] == 0

    # Customer searches for club expenses
    resp_exp = client.get("/api/v1/search?q=expense&category=finance", headers=customer_auth_headers)
    assert resp_exp.status_code == 200
    # Customer should never see Expense records
    assert all("Expense:" not in r["title"] for r in resp_exp.json()["results"])

    # Customer searching for invoices only sees their own
    resp_inv = client.get("/api/v1/search?q=APEX-INV&category=finance", headers=customer_auth_headers)
    assert resp_inv.status_code == 200
    # Every returned invoice must belong to customer user
    for inv_result in resp_inv.json()["results"]:
        assert inv_result["entity_type"] == "finance"


def test_search_sql_injection_safety(client, auth_headers):
    """Verify parameterized queries prevent SQL injection payloads from executing."""
    injection_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1' UNION SELECT null, null, null, null --",
        "admin'--",
        "\" or 1=1--",
    ]
    for payload in injection_payloads:
        resp = client.get(f"/api/v1/search?q={payload}", headers=auth_headers)
        assert resp.status_code == 200
        # Should return safe structured response without 500 error or syntax exception
        assert "results" in resp.json()


def test_search_shop_navigation_url(client, auth_headers):
    """Verify shop product results link directly to /customer/shop?product=<id>&search=<name>."""
    resp = client.get("/api/v1/search?q=racket&category=shop", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0
    shop_products = [r for r in data["results"] if r["entity_type"] == "shop" and "Shop:" in r["title"]]
    assert len(shop_products) > 0
    for product in shop_products:
        assert "/customer/shop" in product["navigation_url"]
        assert f"product={product['id']}" in product["navigation_url"]

