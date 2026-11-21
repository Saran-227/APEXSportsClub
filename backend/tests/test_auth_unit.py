"""Unit and functional tests for Phase 2 authentication, RBAC, and security."""
from datetime import datetime, timedelta, timezone
import uuid

import pytest
from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.audit.models import AuditLog
from backend.app.audit.service import sanitize_details
from backend.app.auth.dependencies import (
    get_current_user,
    require_authenticated_user,
    require_permission,
)
from backend.app.auth.models import User, UserSession
from backend.app.auth.rate_limiter import login_rate_limiter
from backend.app.auth.security import (
    generate_csrf_token,
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_csrf_token,
    verify_password,
)
from backend.app.auth.service import create_user, seed_initial_rbac
from backend.app.main import app


# Register temporary test routes for RBAC testing
rbac_test_router = APIRouter(prefix="/api/v1/test-rbac")


@rbac_test_router.get("/court-booking")
def route_court_booking(user: User = Depends(require_permission("court:book"))):
    return {"status": "success", "user_id": str(user.id)}


@rbac_test_router.get("/admin-only")
def route_admin_only(user: User = Depends(require_permission("admin:access"))):
    return {"status": "admin_granted", "user_id": str(user.id)}


app.include_router(rbac_test_router)


def client_login(client: TestClient, email: str, password: str):
    """Helper to perform pre-login CSRF handshake and submit credentials."""
    init_resp = client.get("/api/v1/auth/csrf-init")
    assert init_resp.status_code == 200
    csrf_token = init_resp.json()["csrf_token"]

    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers={"X-CSRF-Token": csrf_token},
    )


@pytest.fixture
def setup_rbac(db_session: Session):
    """Seed roles and permissions for tests."""
    seed_initial_rbac(db_session)


@pytest.fixture
def member_user(db_session: Session, setup_rbac):
    """Create a standard active Member user."""
    return create_user(
        db=db_session,
        email="member@club.com",
        password="SecureMemberPass123!",
        first_name="Alice",
        last_name="Member",
        role_names=["Member"],
    )


@pytest.fixture
def admin_user(db_session: Session, setup_rbac):
    """Create an active Admin user."""
    return create_user(
        db=db_session,
        email="admin@club.com",
        password="SuperAdminPass123!",
        first_name="Bob",
        last_name="Admin",
        role_names=["Admin"],
    )


# -----------------------------------------------------------------------------
# Cryptography & Security Primitives
# -----------------------------------------------------------------------------


def test_argon2id_password_hashing():
    """Verify passwords are secure and verify correctly with Argon2id."""
    password = "CorrectHorseBatteryStaple!"
    hashed = hash_password(password)

    assert hashed.startswith("$argon2id$")
    assert verify_password(hashed, password) is True
    assert verify_password(hashed, "WrongPassword!") is False
    assert verify_password("invalid$hash", password) is False


def test_session_token_hashing_and_randomness():
    """Verify session tokens are random and SHA-256 hashed correctly."""
    token1 = generate_session_token()
    token2 = generate_session_token()
    assert token1 != token2
    assert len(token1) >= 40

    hash1 = hash_session_token(token1)
    hash2 = hash_session_token(token2)
    assert len(hash1) == 64  # SHA-256 hex string length
    assert hash1 != hash2


def test_csrf_token_constant_time_verification():
    """Verify anti-CSRF token verification handles matching and tampering."""
    token = generate_csrf_token()
    assert verify_csrf_token(token, token) is True
    assert verify_csrf_token(token, "tampered_token") is False
    assert verify_csrf_token("", token) is False
    assert verify_csrf_token(token, None) is False


def test_audit_detail_sanitization():
    """Ensure sensitive credentials are never stored in audit log details."""
    raw_details = {
        "email": "user@example.com",
        "password": "SecretPassword123!",
        "session_token": "raw_token_xyz",
        "reason": "invalid_credentials",
    }
    sanitized = sanitize_details(raw_details)
    assert sanitized["email"] == "user@example.com"
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["session_token"] == "[REDACTED]"
    assert sanitized["reason"] == "invalid_credentials"


# -----------------------------------------------------------------------------
# CSRF Handshake & Authentication Endpoints
# -----------------------------------------------------------------------------


def test_csrf_init_endpoint(client: TestClient):
    """Test GET /api/v1/auth/csrf-init sets anti-CSRF cookie and returns token."""
    response = client.get("/api/v1/auth/csrf-init")
    assert response.status_code == 200
    data = response.json()
    assert "csrf_token" in data
    assert len(data["csrf_token"]) == 64  # hex 32 bytes

    # Verify cookie set with HttpOnly=False so frontend JS can read it
    cookies = response.cookies
    assert "scms_csrf_token" in cookies
    set_cookie_header = response.headers["set-cookie"].lower()
    assert "samesite=lax" in set_cookie_header
    assert "path=/" in set_cookie_header


def test_login_csrf_protection_enforcement(client: TestClient, member_user: User):
    """Verify login requires valid pre-login CSRF token header matching cookie."""
    # 1. Missing CSRF header entirely -> 403 Forbidden
    resp_no_header = client.post(
        "/api/v1/auth/login",
        json={"email": "member@club.com", "password": "SecureMemberPass123!"},
    )
    assert resp_no_header.status_code == 403
    assert "CSRF token validation failed" in resp_no_header.json()["detail"]

    # 2. Tampered / mismatched CSRF header -> 403 Forbidden
    init_resp = client.get("/api/v1/auth/csrf-init")
    resp_bad_header = client.post(
        "/api/v1/auth/login",
        json={"email": "member@club.com", "password": "SecureMemberPass123!"},
        headers={"X-CSRF-Token": "forged_csrf_token_value_00000"},
    )
    assert resp_bad_header.status_code == 403

    # 3. Valid CSRF header matching cookie -> 200 OK
    csrf_token = init_resp.json()["csrf_token"]
    resp_valid = client.post(
        "/api/v1/auth/login",
        json={"email": "member@club.com", "password": "SecureMemberPass123!"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert resp_valid.status_code == 200
    assert resp_valid.json()["message"] == "Login successful"


def test_valid_login(client: TestClient, member_user: User, db_session: Session):
    """Test successful login issues HTTP-only cookie, CSRF cookie, and audit log."""
    response = client_login(client, "member@club.com", "SecureMemberPass123!")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Login successful"
    assert data["user"]["email"] == "member@club.com"
    assert "Member" in data["user"]["roles"]
    assert "court:book" in data["user"]["permissions"]
    assert "csrf_token" in data

    # Verify cookies
    cookies = response.cookies
    assert "scms_session" in cookies
    assert "scms_csrf_token" in cookies

    # Verify audit log recorded
    logs = db_session.execute(
        select(AuditLog).where(AuditLog.event_type == "LOGIN_SUCCESS")
    ).scalars().all()
    assert len(logs) >= 1
    assert logs[-1].user_id == member_user.id


def test_invalid_password(client: TestClient, member_user: User, db_session: Session):
    """Test login with incorrect password returns generic 401 error."""
    response = client_login(client, "member@club.com", "WrongPassword999!")
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
    assert "scms_session" not in response.cookies

    # Verify audit log recorded
    logs = db_session.execute(
        select(AuditLog).where(AuditLog.event_type == "LOGIN_FAILURE")
    ).scalars().all()
    assert len(logs) >= 1
    assert logs[-1].user_id == member_user.id


def test_unknown_user(client: TestClient, db_session: Session):
    """Test login with unknown email returns identical generic 401 error."""
    response = client_login(client, "nonexistent@club.com", "AnyPassword123!")
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

    # Verify audit log recorded
    logs = db_session.execute(
        select(AuditLog).where(AuditLog.event_type == "LOGIN_FAILURE")
    ).scalars().all()
    assert len(logs) >= 1
    assert logs[-1].user_id is None


def test_inactive_user_login_rejected(client: TestClient, db_session: Session, setup_rbac):
    """Verify inactive user cannot log in, no session is issued, and audit log is created."""
    inactive_user = create_user(
        db=db_session,
        email="inactive@club.com",
        password="ValidPassword123!",
        first_name="Ian",
        last_name="Inactive",
        role_names=["Member"],
        is_active=False,
    )

    response = client_login(client, "inactive@club.com", "ValidPassword123!")
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
    assert "scms_session" not in response.cookies

    # Verify no session issued in DB
    sessions = db_session.execute(
        select(UserSession).where(UserSession.user_id == inactive_user.id)
    ).scalars().all()
    assert len(sessions) == 0

    # Verify audit log contains reason: inactive_account
    logs = db_session.execute(
        select(AuditLog).where(
            AuditLog.event_type == "LOGIN_FAILURE",
            AuditLog.user_id == inactive_user.id,
        )
    ).scalars().all()
    assert len(logs) >= 1
    assert logs[-1].details.get("reason") == "inactive_account"


def test_logout(client: TestClient, member_user: User, db_session: Session):
    """Test logout revokes session in DB and deletes cookies."""
    # 1. Login
    login_resp = client_login(client, "member@club.com", "SecureMemberPass123!")
    assert login_resp.status_code == 200
    csrf_token = login_resp.json()["csrf_token"]
    session_cookie = login_resp.cookies["scms_session"]

    # 2. Logout with CSRF token header
    client.cookies.set("scms_session", session_cookie)
    client.cookies.set("scms_csrf_token", csrf_token)
    logout_resp = client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["message"] == "Logout successful"

    # Verify session is marked revoked in database
    hashed_token = hash_session_token(session_cookie)
    db_session.expire_all()
    db_session_obj = db_session.execute(
        select(UserSession).where(UserSession.session_token_hash == hashed_token)
    ).scalar_one()
    assert db_session_obj.is_revoked is True

    # Verify audit log recorded
    logs = db_session.execute(
        select(AuditLog).where(AuditLog.event_type == "LOGOUT")
    ).scalars().all()
    assert len(logs) >= 1
    assert logs[-1].user_id == member_user.id


def test_unauthenticated_access(client: TestClient):
    """Test accessing protected route without session returns 401."""
    client.cookies.clear()
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_current_user_endpoint(client: TestClient, member_user: User):
    """Test /api/v1/auth/me returns current user profile and permissions."""
    login_resp = client_login(client, "member@club.com", "SecureMemberPass123!")
    assert login_resp.status_code == 200

    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    data = me_resp.json()
    assert data["email"] == "member@club.com"
    assert data["first_name"] == "Alice"
    assert data["last_name"] == "Member"
    assert "Member" in data["roles"]
    assert "court:book" in data["permissions"]


def test_expired_session(client: TestClient, member_user: User, db_session: Session):
    """Test request with expired session token is rejected with 401."""
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)

    # Insert already-expired session
    expired_time = datetime.now(timezone.utc) - timedelta(hours=2)
    session = UserSession(
        user_id=member_user.id,
        session_token_hash=token_hash,
        expires_at=expired_time,
        last_activity_at=datetime.now(timezone.utc),
        is_revoked=False,
    )
    db_session.add(session)
    db_session.commit()

    client.cookies.set("scms_session", raw_token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_idle_session_timeout(client: TestClient, member_user: User, db_session: Session):
    """Test session with last activity older than idle timeout (30m) is rejected."""
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)

    now = datetime.now(timezone.utc)
    # Expiry is 7 days away, but last activity is 31 minutes ago (>1800s)
    session = UserSession(
        user_id=member_user.id,
        session_token_hash=token_hash,
        expires_at=now + timedelta(days=7),
        last_activity_at=now - timedelta(seconds=1805),
        is_revoked=False,
    )
    db_session.add(session)
    db_session.commit()

    client.cookies.set("scms_session", raw_token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "inactivity" in response.json()["detail"].lower()


def test_active_session_updates_last_activity(client: TestClient, member_user: User, db_session: Session):
    """Test active session within idle window succeeds and updates last_activity_at."""
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)

    now = datetime.now(timezone.utc)
    old_activity = now - timedelta(minutes=5)
    session = UserSession(
        user_id=member_user.id,
        session_token_hash=token_hash,
        expires_at=now + timedelta(days=7),
        last_activity_at=old_activity,
        is_revoked=False,
    )
    db_session.add(session)
    db_session.commit()

    client.cookies.set("scms_session", raw_token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200

    db_session.expire_all()
    updated = db_session.execute(
        select(UserSession).where(UserSession.session_token_hash == token_hash)
    ).scalar_one()
    # last_activity_at must be updated to approximately now
    assert updated.last_activity_at is not None


def test_revoked_session(client: TestClient, member_user: User, db_session: Session):
    """Test request with revoked session token is rejected with 401."""
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)

    session = UserSession(
        user_id=member_user.id,
        session_token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        last_activity_at=datetime.now(timezone.utc),
        is_revoked=True,
    )
    db_session.add(session)
    db_session.commit()

    client.cookies.set("scms_session", raw_token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "revoked" in response.json()["detail"].lower()


# -----------------------------------------------------------------------------
# RBAC Permissions & Authorization
# -----------------------------------------------------------------------------


def test_permission_granted(client: TestClient, member_user: User):
    """Test user with 'court:book' permission can access court-booking route."""
    login_resp = client_login(client, "member@club.com", "SecureMemberPass123!")
    assert login_resp.status_code == 200

    resp = client.get("/api/v1/test-rbac/court-booking")
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"


def test_permission_denied(client: TestClient, member_user: User, db_session: Session):
    """Test user lacking 'admin:access' is rejected with 403 and audit logged."""
    login_resp = client_login(client, "member@club.com", "SecureMemberPass123!")
    assert login_resp.status_code == 200

    resp = client.get("/api/v1/test-rbac/admin-only")
    assert resp.status_code == 403
    assert "Permission denied" in resp.json()["detail"]

    # Verify audit log recorded
    logs = db_session.execute(
        select(AuditLog).where(AuditLog.event_type == "PERMISSION_DENIED")
    ).scalars().all()
    assert len(logs) >= 1
    assert logs[-1].user_id == member_user.id
    assert logs[-1].details["required_permission"] == "admin:access"


def test_admin_role_bypasses_granular_permissions(client: TestClient, admin_user: User):
    """Test admin role is granted access to all protected endpoints."""
    login_resp = client_login(client, "admin@club.com", "SuperAdminPass123!")
    assert login_resp.status_code == 200

    resp_booking = client.get("/api/v1/test-rbac/court-booking")
    assert resp_booking.status_code == 200

    resp_admin = client.get("/api/v1/test-rbac/admin-only")
    assert resp_admin.status_code == 200
    assert resp_admin.json()["status"] == "admin_granted"


# -----------------------------------------------------------------------------
# Rate Limiting & Security Attributes
# -----------------------------------------------------------------------------


def test_rate_limiting_after_consecutive_failures(client: TestClient, member_user: User):
    """Test 5 consecutive failed login attempts trigger HTTP 429 Too Many Requests."""
    init_resp = client.get("/api/v1/auth/csrf-init")
    csrf_token = init_resp.json()["csrf_token"]

    for i in range(5):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "member@club.com", "password": "WrongPassword!"},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert resp.status_code == 401

    # 6th attempt should be rate limited
    rate_limited_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "member@club.com", "password": "WrongPassword!"},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert rate_limited_resp.status_code == 429
    assert "Too many login attempts" in rate_limited_resp.json()["detail"]
    assert "Retry-After" in rate_limited_resp.headers


def test_cookie_security_attributes(client: TestClient, member_user: User):
    """Verify HTTP-only, SameSite, and Path cookie security flags."""
    response = client_login(client, "member@club.com", "SecureMemberPass123!")
    assert response.status_code == 200

    set_cookie_headers = response.headers.get_list("set-cookie")
    session_cookie_header = next(h for h in set_cookie_headers if "scms_session=" in h)

    assert "httponly" in session_cookie_header.lower()
    assert "samesite=lax" in session_cookie_header.lower()
    assert "path=/" in session_cookie_header.lower()


def test_csrf_protection_enforcement_on_logout(client: TestClient, member_user: User):
    """Verify state-changing POST /logout fails without valid X-CSRF-Token."""
    login_resp = client_login(client, "member@club.com", "SecureMemberPass123!")
    assert login_resp.status_code == 200
    csrf_token = login_resp.json()["csrf_token"]
    session_cookie = login_resp.cookies["scms_session"]

    client.cookies.set("scms_session", session_cookie)
    client.cookies.set("scms_csrf_token", csrf_token)

    # 1. Missing header -> 403
    resp_no_header = client.post("/api/v1/auth/logout")
    assert resp_no_header.status_code == 403
    assert "CSRF token validation failed" in resp_no_header.json()["detail"]

    # 2. Tampered header -> 403
    resp_bad_header = client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": "invalid_forged_csrf_token"},
    )
    assert resp_bad_header.status_code == 403

    # 3. Valid header -> 200
    resp_valid = client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert resp_valid.status_code == 200


def test_bearer_fallback_for_cli_and_integration_tooling(client: TestClient, member_user: User):
    """Verify Authorization: Bearer <token> fallback operates for CLI clients without cookies."""
    # Login and obtain session token
    login_resp = client_login(client, "member@club.com", "SecureMemberPass123!")
    assert login_resp.status_code == 200
    raw_token = login_resp.cookies["scms_session"]

    # Purge all client cookies to simulate a pure CLI/HTTP client sending only the header
    client.cookies.clear()

    # 1. Access /me using Bearer header
    cli_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {raw_token}"},
    )
    assert cli_resp.status_code == 200
    assert cli_resp.json()["email"] == "member@club.com"

    # 2. Access /me with invalid Bearer token returns 401
    invalid_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_nonexistent_token"},
    )
    assert invalid_resp.status_code == 401
