"""Real PostgreSQL 18 integration tests for authentication and security."""
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from backend.app.audit.models import AuditLog
from backend.app.auth.models import Role, User, UserRole, UserSession
from backend.app.auth.security import hash_session_token
from backend.app.auth.service import create_user, seed_initial_rbac
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
    """Provide real PostgreSQL session with cleanup after test."""
    session = PgSessionLocal()
    yield session
    session.close()


@pytest.fixture
def pg_client(pg_session: Session):
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


def test_real_postgres_end_to_end_auth_flow(pg_client: TestClient, pg_session: Session):
    """Execute end-to-end authentication cycle against real PostgreSQL 18 instance."""
    # 1. Seed RBAC in PostgreSQL
    seed_initial_rbac(pg_session)

    # 2. Provision integration test user
    test_email = f"integration_{uuid.uuid4().hex[:8]}@club.com"
    test_password = "PgIntegrationSecret2026!"

    user = create_user(
        db=pg_session,
        email=test_email,
        password=test_password,
        first_name="Postgres",
        last_name="Tester",
        role_names=["Staff"],
    )

    try:
        # 3. Pre-login CSRF handshake
        init_resp = pg_client.get("/api/v1/auth/csrf-init")
        assert init_resp.status_code == 200
        pre_csrf_token = init_resp.json()["csrf_token"]

        # 4. Perform login against real DB with CSRF header
        login_resp = pg_client.post(
            "/api/v1/auth/login",
            json={"email": test_email, "password": test_password},
            headers={"X-CSRF-Token": pre_csrf_token},
        )
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        assert login_data["user"]["email"] == test_email
        assert "Staff" in login_data["user"]["roles"]
        assert "shop:manage" in login_data["user"]["permissions"]

        session_cookie = login_resp.cookies["scms_session"]
        csrf_token = login_data["csrf_token"]

        # 5. Verify PostgreSQL session record directly
        hashed_token = hash_session_token(session_cookie)
        db_session = pg_session.execute(
            select(UserSession).where(UserSession.session_token_hash == hashed_token)
        ).scalar_one()
        assert db_session.user_id == user.id
        assert db_session.is_revoked is False
        assert db_session.last_activity_at is not None

        # 6. Access /me endpoint with cookies
        pg_client.cookies.set("scms_session", session_cookie)
        me_resp = pg_client.get("/api/v1/auth/me")
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == test_email

        # 7. Logout and verify revocation in PostgreSQL
        pg_client.cookies.set("scms_csrf_token", csrf_token)
        logout_resp = pg_client.post(
            "/api/v1/auth/logout",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert logout_resp.status_code == 200

        pg_session.expire_all()
        rechecked_session = pg_session.execute(
            select(UserSession).where(UserSession.session_token_hash == hashed_token)
        ).scalar_one()
        assert rechecked_session.is_revoked is True

        # 8. Verify PostgreSQL audit_logs entries
        audit_entries = pg_session.execute(
            select(AuditLog)
            .where(AuditLog.user_id == user.id)
            .order_by(AuditLog.created_at.asc())
        ).scalars().all()

        event_types = [entry.event_type for entry in audit_entries]
        assert "LOGIN_SUCCESS" in event_types
        assert "LOGOUT" in event_types

    finally:
        # Clean up test user & associated records
        pg_session.rollback()
        pg_session.execute(
            text("DELETE FROM audit_logs WHERE user_id = :uid"), {"uid": user.id}
        )
        pg_session.execute(
            text("DELETE FROM user_roles WHERE user_id = :uid"), {"uid": user.id}
        )
        pg_session.execute(
            text("DELETE FROM sessions WHERE user_id = :uid"), {"uid": user.id}
        )
        pg_session.execute(
            text("DELETE FROM users WHERE id = :uid"), {"uid": user.id}
        )
        pg_session.commit()
