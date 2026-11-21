"""FastAPI router for authentication and session endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import (
    get_current_session,
    get_current_user,
    require_csrf,
    require_login_csrf,
)
from backend.app.auth.models import User, UserSession
from backend.app.auth.schemas import (
    CSRFInitResponse,
    GoogleAuthRequest,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RegisterRequest,
    UserDetailResponse,
    UserResponse,
)
from backend.app.auth.security import generate_csrf_token
from backend.app.auth.service import (
    authenticate_google_user,
    authenticate_user,
    get_user_roles_and_permissions,
    register_customer,
    resolve_primary_role,
    revoke_session,
)
from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.core.exceptions import (
    AuthenticationFailedError,
    RateLimitExceededError,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])


@router.get(
    "/csrf-init",
    response_model=CSRFInitResponse,
    summary="Initialize Pre-Login CSRF Handshake",
    description="Generate a cryptographically secure anti-CSRF token cookie and response payload required before invoking login.",
)
def csrf_init(response: Response) -> CSRFInitResponse:
    settings = get_settings()
    token = generate_csrf_token()

    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_EXPIRE_SECONDS,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )

    return CSRFInitResponse(csrf_token=token)


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="User Login",
    description="Authenticate with email, password, and pre-login CSRF token to receive stateful session and anti-CSRF cookies.",
    dependencies=[Depends(require_login_csrf)],
)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    settings = get_settings()
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        user, raw_session_token, csrf_token = authenticate_user(
            db=db,
            email=payload.email,
            password=payload.password,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except RateLimitExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=exc.message,
            headers={"Retry-After": str(exc.retry_after)},
        )
    except AuthenticationFailedError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message,
        )

    # Attach HTTP-only session cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_session_token,
        max_age=settings.SESSION_EXPIRE_SECONDS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )

    # Attach refreshed anti-CSRF token cookie
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=settings.SESSION_EXPIRE_SECONDS,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )

    roles, permissions = get_user_roles_and_permissions(db, user.id)
    primary_role = resolve_primary_role(roles)

    user_data = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        full_name=f"{user.first_name} {user.last_name}".strip(),
        role=primary_role,
        phone_number=user.phone_number,
        is_active=user.is_active,
        is_verified=user.is_verified,
        roles=roles,
        permissions=permissions,
        created_at=user.created_at,
    )

    return LoginResponse(
        message="Login successful",
        user=user_data,
        csrf_token=csrf_token,
    )


@router.post(
    "/register",
    response_model=LoginResponse,
    summary="Customer Registration",
    description="Register a new customer account, provision member profile, and set secure session cookies.",
)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    settings = get_settings()
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user, raw_session_token, csrf_token = register_customer(
        db=db,
        email=payload.email,
        password=payload.password,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone_number=payload.phone_number,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # Attach session cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_session_token,
        max_age=settings.SESSION_EXPIRE_SECONDS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )
    # Attach CSRF cookie
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=settings.SESSION_EXPIRE_SECONDS,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )

    roles, permissions = get_user_roles_and_permissions(db, user.id)
    primary_role = resolve_primary_role(roles)

    user_data = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        full_name=f"{user.first_name} {user.last_name}".strip(),
        role=primary_role,
        phone_number=user.phone_number,
        is_active=user.is_active,
        is_verified=user.is_verified,
        roles=roles,
        permissions=permissions,
        created_at=user.created_at,
    )

    return LoginResponse(
        message="Registration successful",
        user=user_data,
        csrf_token=csrf_token,
    )


@router.post(
    "/google",
    response_model=LoginResponse,
    summary="Google OAuth Sign-In",
    description="Authenticate user with verified Google JWT credential and set secure session cookies.",
)
def google_auth(
    payload: GoogleAuthRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    settings = get_settings()
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user, raw_session_token, csrf_token = authenticate_google_user(
        db=db,
        credential=payload.credential,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_session_token,
        max_age=settings.SESSION_EXPIRE_SECONDS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=settings.SESSION_EXPIRE_SECONDS,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )

    roles, permissions = get_user_roles_and_permissions(db, user.id)
    primary_role = resolve_primary_role(roles)

    user_data = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        full_name=f"{user.first_name} {user.last_name}".strip(),
        role=primary_role,
        phone_number=user.phone_number,
        is_active=user.is_active,
        is_verified=user.is_verified,
        roles=roles,
        permissions=permissions,
        created_at=user.created_at,
    )

    return LoginResponse(
        message="Google authentication successful",
        user=user_data,
        csrf_token=csrf_token,
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="User Logout",
    description="Revoke the active user session and purge authentication cookies.",
    dependencies=[Depends(require_csrf)],
)
def logout(
    request: Request,
    response: Response,
    session: UserSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> LogoutResponse:
    settings = get_settings()
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    revoke_session(
        db=db,
        session=session,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # Clear authentication and CSRF cookies
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        domain=settings.COOKIE_DOMAIN,
        path="/",
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key=settings.CSRF_COOKIE_NAME,
        domain=settings.COOKIE_DOMAIN,
        path="/",
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )

    return LogoutResponse(message="Logout successful")


@router.get(
    "/me",
    response_model=UserDetailResponse,
    summary="Current User Profile & Permissions",
    description="Retrieve the authenticated user's profile, assigned RBAC roles, and resolved permissions.",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserDetailResponse:
    roles, permissions = get_user_roles_and_permissions(db, current_user.id)
    primary_role = resolve_primary_role(roles)

    return UserDetailResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        full_name=f"{current_user.first_name} {current_user.last_name}".strip(),
        role=primary_role,
        phone_number=current_user.phone_number,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        roles=roles,
        permissions=permissions,
        created_at=current_user.created_at,
    )
