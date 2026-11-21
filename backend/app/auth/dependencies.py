"""Reusable FastAPI authorization and authentication dependencies."""
from datetime import datetime, timezone
from typing import Callable, Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.audit.service import create_audit_log
from backend.app.auth.models import User, UserSession
from backend.app.auth.security import hash_session_token, verify_csrf_token
from backend.app.auth.service import get_user_roles_and_permissions
from backend.app.core.config import get_settings
from backend.app.core.database import get_db


def extract_session_token(request: Request) -> Optional[str]:
    """Extract raw session token from HTTP-only cookie or Authorization header fallback.

    Note:
        Browser client applications MUST authenticate using secure HTTP-only cookies.
        The Authorization Bearer fallback is strictly reserved for authorized CLI and
        integration testing tooling. Session tokens must NEVER be stored in browser
        JavaScript storage (localStorage / sessionStorage).
    """
    settings = get_settings()
    # 1. Primary: read from secure cookie
    cookie_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if cookie_token:
        return cookie_token.strip()

    # 2. Secondary fallback for CLI tools and automated integration testing: Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()

    return None


def get_current_session(
    request: Request,
    db: Session = Depends(get_db),
) -> UserSession:
    """Validate session token and return active UserSession."""
    settings = get_settings()
    raw_token = extract_session_token(request)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_hash = hash_session_token(raw_token)
    stmt = select(UserSession).where(
        UserSession.session_token_hash == token_hash,
        UserSession.is_revoked.is_(False),
    )
    session = db.execute(stmt).scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked session.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    now_utc = datetime.now(timezone.utc)

    # 1. Validate absolute expiration
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now_utc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Validate idle inactivity timeout
    if session.last_activity_at is not None:
        last_activity = session.last_activity_at
        if last_activity.tzinfo is None:
            last_activity = last_activity.replace(tzinfo=timezone.utc)

        if (now_utc - last_activity).total_seconds() > settings.SESSION_IDLE_TIMEOUT_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session timed out due to inactivity. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Update last activity timestamp
    session.last_activity_at = now_utc
    db.commit()

    return session


def get_current_user(
    session: UserSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> User:
    """Ensure session belongs to an active user account."""
    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or disabled.",
        )
    return user


def require_authenticated_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Strict dependency requiring any authenticated active user."""
    return current_user


def require_login_csrf(request: Request) -> None:
    """Enforce pre-login CSRF token verification."""
    settings = get_settings()
    header_token = request.headers.get(settings.CSRF_HEADER_NAME)
    cookie_token = request.cookies.get(settings.CSRF_COOKIE_NAME)

    if not verify_csrf_token(header_token, cookie_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token validation failed. Please initialize via /auth/csrf-init.",
        )


def require_csrf(request: Request) -> None:
    """Enforce CSRF token validation on state-changing requests using cookie authentication."""
    settings = get_settings()

    # Only validate on mutating HTTP methods
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        # Check if cookie-based authentication is being used
        if settings.SESSION_COOKIE_NAME in request.cookies:
            header_token = request.headers.get(settings.CSRF_HEADER_NAME)
            cookie_token = request.cookies.get(settings.CSRF_COOKIE_NAME)

            if not verify_csrf_token(header_token, cookie_token):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token validation failed.",
                )


def require_permission(permission_code: str) -> Callable:
    """Dependency factory enforcing specific permission capability on the authenticated user."""

    def dependency(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        roles, permissions = get_user_roles_and_permissions(db, current_user.id)

        # Admin role bypasses granular permissions
        if "Admin" in roles or permission_code in permissions:
            return current_user

        # Record unauthorized privilege escalation attempt
        create_audit_log(
            db=db,
            event_type="PERMISSION_DENIED",
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"required_permission": permission_code, "roles": roles},
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied. Required capability: '{permission_code}'.",
        )

    return dependency
