"""Test suite for 5-minute Court Reservation Hold & Concurrent Locking."""
import uuid
from datetime import date, datetime, time, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from backend.app.auth.models import Role, User, UserRole, UserSession
from backend.app.auth.security import hash_session_token
from backend.app.bookings.models import Court, CourtBooking, CourtHold
from backend.app.core.config import Settings
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


def create_user_and_headers(session: Session, email: str, role_name: str = "CUSTOMER") -> tuple[User, dict]:
    """Helper to create a user and active session headers."""
    existing = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        user = existing
    else:
        user = User(
            email=email,
            hashed_password="test_hashed_pwd",
            first_name="Test",
            last_name="Athlete",
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


def test_court_hold_lifecycle_and_mutual_exclusion(client: TestClient, pg_session: Session):
    """Verify User A locks court for 5 min, User B is blocked, User A refreshes, releases, and User B can acquire."""
    # Find active court
    court = pg_session.execute(select(Court).where(Court.is_active == True)).scalars().first()
    assert court is not None, "At least one active court must exist"

    # Create two distinct test athletes
    user_a, headers_a = create_user_and_headers(pg_session, f"usera_{uuid.uuid4().hex[:6]}@example.com")
    user_b, headers_b = create_user_and_headers(pg_session, f"userb_{uuid.uuid4().hex[:6]}@example.com")

    test_date = (date.today() + timedelta(days=7)).isoformat()
    test_slot = "18:00"

    # 1. User A acquires 5-minute hold on the court
    resp_a = client.post(
        f"/api/v1/courts/{court.id}/hold",
        json={"booking_date": test_date, "start_time": test_slot},
        headers=headers_a,
    )
    assert resp_a.status_code == 200 or resp_a.status_code == 201
    data_a = resp_a.json()
    assert data_a["court_id"] == str(court.id)
    assert data_a["held_by_current_user"] is True
    assert data_a["remaining_seconds"] <= 300 and data_a["remaining_seconds"] >= 290

    # 2. User B tries to view or open booking for that court in the running 5 minutes
    resp_b = client.post(
        f"/api/v1/courts/{court.id}/hold",
        json={"booking_date": test_date, "start_time": test_slot},
        headers=headers_b,
    )
    # User B MUST be blocked with 423 Locked and explicit message
    assert resp_b.status_code == 423
    assert "booking process by someone else right now" in resp_b.json()["detail"]

    # 3. Active holds list endpoint reflects court held
    resp_holds = client.get(
        f"/api/v1/courts/holds/active?court_id={court.id}&booking_date={test_date}",
        headers=headers_b,
    )
    assert resp_holds.status_code == 200
    active_items = resp_holds.json()
    assert len(active_items) >= 1
    assert any(h["court_id"] == str(court.id) and h["held_by_current_user"] is False for h in active_items)

    # 4. User A re-opens or refreshes popup (User A is NOT locked out by own hold)
    resp_a_refresh = client.post(
        f"/api/v1/courts/{court.id}/hold",
        json={"booking_date": test_date, "start_time": test_slot},
        headers=headers_a,
    )
    assert resp_a_refresh.status_code == 200
    assert resp_a_refresh.json()["held_by_current_user"] is True

    # 5. User A cancels / closes popup -> releases hold
    resp_rel = client.post(
        f"/api/v1/courts/{court.id}/release-hold",
        json={"booking_date": test_date, "start_time": test_slot},
        headers=headers_a,
    )
    assert resp_rel.status_code == 200

    # 6. User B now tries to acquire hold -> succeeds immediately!
    resp_b_acquire = client.post(
        f"/api/v1/courts/{court.id}/hold",
        json={"booking_date": test_date, "start_time": test_slot},
        headers=headers_b,
    )
    assert resp_b_acquire.status_code == 200 or resp_b_acquire.status_code == 201
    assert resp_b_acquire.json()["held_by_current_user"] is True

    # Cleanup User B's hold
    client.post(
        f"/api/v1/courts/{court.id}/release-hold",
        json={"booking_date": test_date, "start_time": test_slot},
        headers=headers_b,
    )


def test_court_hold_multi_tab_isolation_same_user(client: TestClient, pg_session: Session):
    """Verify hold isolation between two tabs opened by the same user account."""
    court = pg_session.execute(select(Court).where(Court.is_active == True)).scalars().first()
    assert court is not None

    user, headers = create_user_and_headers(pg_session, f"usertab_{uuid.uuid4().hex[:6]}@example.com")
    test_date = (date.today() + timedelta(days=8)).isoformat()
    test_slot = "19:00"

    tab_1 = "tab_alpha_111"
    tab_2 = "tab_beta_222"

    # Tab 1 acquires hold
    resp_tab1 = client.post(
        f"/api/v1/courts/{court.id}/hold",
        json={"booking_date": test_date, "start_time": test_slot, "client_session_id": tab_1},
        headers=headers,
    )
    assert resp_tab1.status_code == 200 or resp_tab1.status_code == 201
    assert resp_tab1.json()["held_by_current_user"] is True

    # Tab 2 (same user account) attempts to acquire hold on same court/slot
    resp_tab2 = client.post(
        f"/api/v1/courts/{court.id}/hold",
        json={"booking_date": test_date, "start_time": test_slot, "client_session_id": tab_2},
        headers=headers,
    )
    assert resp_tab2.status_code == 423
    assert "booking process by someone else right now" in resp_tab2.json()["detail"]

    # Active holds query from Tab 2 indicates held_by_current_user is False for Tab 2
    resp_holds_tab2 = client.get(
        f"/api/v1/courts/holds/active?court_id={court.id}&booking_date={test_date}&client_session_id={tab_2}",
        headers=headers,
    )
    assert resp_holds_tab2.status_code == 200
    items = resp_holds_tab2.json()
    assert any(h["court_id"] == str(court.id) and h["held_by_current_user"] is False for h in items)

    # Clean up Tab 1 hold
    client.post(
        f"/api/v1/courts/{court.id}/release-hold",
        json={"booking_date": test_date, "start_time": test_slot, "client_session_id": tab_1},
        headers=headers,
    )
