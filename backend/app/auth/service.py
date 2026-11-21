"""Authentication and user session management service."""
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.audit.service import create_audit_log
from backend.app.auth.models import (
    Permission,
    Role,
    RolePermission,
    User,
    UserRole,
    UserSession,
)
from backend.app.auth.rate_limiter import login_rate_limiter
from backend.app.auth.security import (
    generate_csrf_token,
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)
from backend.app.core.config import get_settings
from backend.app.core.exceptions import (
    AuthenticationFailedError,
    EntityConflictError,
    RateLimitExceededError,
)


def authenticate_user(
    db: Session,
    email: str,
    password: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Tuple[User, str, str]:
    """Authenticate credentials, enforce rate limits, and issue stateful session."""
    settings = get_settings()
    clean_email = email.strip().lower()
    rate_key = f"{ip_address or 'unknown'}:{clean_email}"

    # 1. Rate limiting check
    is_allowed, retry_after = login_rate_limiter.check_rate_limit(rate_key)
    if not is_allowed:
        create_audit_log(
            db=db,
            event_type="LOGIN_RATE_LIMITED",
            user_id=None,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"email": clean_email, "retry_after": retry_after},
        )
        raise RateLimitExceededError(
            retry_after=retry_after,
            message="Too many login attempts. Please try again later.",
        )

    # 2. Lookup user
    stmt = select(User).where(User.email == clean_email)
    user = db.execute(stmt).scalar_one_or_none()

    # 3. Verify user and password
    if user is None or not verify_password(user.hashed_password, password):
        login_rate_limiter.record_failure(rate_key)
        create_audit_log(
            db=db,
            event_type="LOGIN_FAILURE",
            user_id=user.id if user else None,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"reason": "invalid_credentials", "email": clean_email},
        )
        raise AuthenticationFailedError("Invalid email or password")

    # 4. Check active status
    if not user.is_active:
        login_rate_limiter.record_failure(rate_key)
        create_audit_log(
            db=db,
            event_type="LOGIN_FAILURE",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"reason": "inactive_account", "email": clean_email},
        )
        raise AuthenticationFailedError("Invalid email or password")

    # 5. Success: reset rate limiter
    login_rate_limiter.reset(rate_key)

    # 6. Issue stateful session token and CSRF token
    raw_session_token = generate_session_token()
    session_token_hash = hash_session_token(raw_session_token)
    csrf_token = generate_csrf_token()

    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(seconds=settings.SESSION_EXPIRE_SECONDS)

    session = UserSession(
        user_id=user.id,
        session_token_hash=session_token_hash,
        user_agent=user_agent[:500] if user_agent else None,
        ip_address=ip_address,
        expires_at=expires_at,
        last_activity_at=now_utc,
        is_revoked=False,
    )
    db.add(session)
    db.commit()

    create_audit_log(
        db=db,
        event_type="LOGIN_SUCCESS",
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        details={"session_id": str(session.id)},
    )

    return user, raw_session_token, csrf_token


def revoke_session(
    db: Session,
    session: UserSession,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Revoke an active session and record audit event."""
    session.is_revoked = True
    db.commit()

    create_audit_log(
        db=db,
        event_type="LOGOUT",
        user_id=session.user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details={"session_id": str(session.id)},
    )


def get_user_roles_and_permissions(db: Session, user_id: uuid.UUID) -> Tuple[List[str], List[str]]:
    """Retrieve distinct role names and permission codes assigned to a user."""
    # Fetch roles
    roles_stmt = (
        select(Role.name, Role.id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    roles_result = db.execute(roles_stmt).all()
    role_names = [r[0] for r in roles_result]
    role_ids = [r[1] for r in roles_result]

    # Fetch permissions
    permissions: List[str] = []
    if role_ids:
        perms_stmt = (
            select(Permission.code)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id.in_(role_ids))
            .distinct()
        )
        permissions = [p[0] for p in db.execute(perms_stmt).all()]

    return role_names, permissions


def create_user(
    db: Session,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    phone_number: Optional[str] = None,
    role_names: Optional[List[str]] = None,
    is_active: bool = True,
    is_verified: bool = True,
) -> User:
    """Create a new user with Argon2id password hash and assign roles."""
    clean_email = email.strip().lower()

    existing = db.execute(select(User).where(User.email == clean_email)).scalar_one_or_none()
    if existing:
        raise EntityConflictError(f"User with email '{clean_email}' already exists.")

    user = User(
        email=clean_email,
        hashed_password=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        phone_number=phone_number,
        is_active=is_active,
        is_verified=is_verified,
    )
    db.add(user)
    db.flush()

    if role_names:
        for r_name in role_names:
            role = db.execute(select(Role).where(Role.name == r_name)).scalar_one_or_none()
            if role:
                user_role = UserRole(user_id=user.id, role_id=role.id)
                db.add(user_role)

    db.commit()
    db.refresh(user)
    return user


def seed_initial_rbac(db: Session) -> dict:
    """Seed initial system roles and permissions if they do not exist."""
    defined_roles = {
        "Admin": "Full administrative access across SCMS",
        "Manager": "Club operations, booking, and inventory management",
        "Staff": "Front desk, check-ins, and basic order processing",
        "Member": "Standard club member with court booking privileges",
    }

    defined_permissions = {
        "admin:access": ("Full system administration", "auth"),
        "court:view": ("View courts and availability", "bookings"),
        "court:book": ("Book sports courts", "bookings"),
        "court:manage": ("Manage courts, schedules, and maintenance", "bookings"),
        "member:view": ("View member directories and profiles", "members"),
        "member:manage": ("Create and update member subscriptions", "members"),
        "shop:view": ("View shop inventory and products", "shop"),
        "shop:manage": ("Manage inventory and process shop orders", "shop"),
        "cafe:view": ("View cafeteria menus and orders", "cafeteria"),
        "cafe:manage": ("Process food and beverage orders", "cafeteria"),
        "finance:view": ("View invoices and reports", "finance"),
        "finance:manage": ("Process payments and record expenses", "finance"),
        "audit:view": ("Inspect system audit trail", "audit"),
    }

    # Role to permission mapping
    role_perms = {
        "Member": ["court:view", "court:book", "shop:view", "cafe:view"],
        "Staff": [
            "court:view", "court:book", "court:manage",
            "member:view", "shop:view", "shop:manage",
            "cafe:view", "cafe:manage",
        ],
        "Manager": [
            "court:view", "court:book", "court:manage",
            "member:view", "member:manage",
            "shop:view", "shop:manage",
            "cafe:view", "cafe:manage",
            "finance:view", "finance:manage",
            "audit:view",
        ],
        "Admin": list(defined_permissions.keys()),
    }

    # Insert permissions
    created_perms = {}
    for code, (desc, module) in defined_permissions.items():
        perm = db.execute(select(Permission).where(Permission.code == code)).scalar_one_or_none()
        if not perm:
            perm = Permission(code=code, description=desc, module=module)
            db.add(perm)
            db.flush()
        created_perms[code] = perm

    # Insert roles and assign permissions
    created_roles = {}
    for r_name, r_desc in defined_roles.items():
        role = db.execute(select(Role).where(Role.name == r_name)).scalar_one_or_none()
        if not role:
            role = Role(name=r_name, description=r_desc, is_system_role=True)
            db.add(role)
            db.flush()
        created_roles[r_name] = role

        # Assign permissions
        target_codes = role_perms.get(r_name, [])
        for p_code in target_codes:
            perm_obj = created_perms.get(p_code)
            if perm_obj:
                existing_rp = db.execute(
                    select(RolePermission).where(
                        RolePermission.role_id == role.id,
                        RolePermission.permission_id == perm_obj.id,
                    )
                ).scalar_one_or_none()
                if not existing_rp:
                    db.add(RolePermission(role_id=role.id, permission_id=perm_obj.id))

    db.commit()
    return {"roles": list(defined_roles.keys()), "permissions": list(defined_permissions.keys())}
