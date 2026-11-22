"""Sports Club Management System (SCMS) - Application Entrypoint."""
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
from typing import Literal

from fastapi import APIRouter, Depends, FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.app import __version__
from backend.app.auth.router import router as auth_router
from backend.app.members.router import router as members_router
from backend.app.bookings.router import router as bookings_router
from backend.app.shop.router import router as shop_router
from backend.app.cafeteria.router import router as cafeteria_router
from backend.app.finance.router import router as finance_router
from backend.app.crm.router import router as crm_router
from backend.app.search.router import router as search_router
from backend.app.employees.router import router as employees_router
from backend.app.analytics.router import router as analytics_router
from backend.app.core.config import get_settings
from backend.app.core.database import check_db_health, get_db
from backend.app.core.exceptions import (
    AuthenticationFailedError,
    CSRFValidationError,
    PermissionDeniedError,
    RateLimitExceededError,
    SCMSException,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("scms.app")


class HealthResponse(BaseModel):
    """Health probe response schema."""
    status: Literal["healthy", "degraded"]
    database: Literal["connected", "disconnected"]
    version: str
    timestamp: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "healthy",
                "database": "connected",
                "version": "1.0.0",
                "timestamp": "2026-11-21T10:30:00Z",
            }
        }
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown hooks."""
    settings = get_settings()
    logger.info("Initializing %s in %s environment...", settings.APP_NAME, settings.APP_ENV)
    yield
    logger.info("Shutting down %s...", settings.APP_NAME)


def create_application() -> FastAPI:
    """FastAPI application factory."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=__version__,
        docs_url=f"{settings.API_V1_PREFIX}/docs" if settings.APP_DEBUG else None,
        redoc_url=f"{settings.API_V1_PREFIX}/redoc" if settings.APP_DEBUG else None,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json" if settings.APP_DEBUG else None,
        lifespan=lifespan,
    )

    # Configure secure CORS with credentials support
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Safe global exception handlers preventing internal details / stack trace leaks
    @app.exception_handler(RateLimitExceededError)
    async def rate_limit_handler(request: Request, exc: RateLimitExceededError):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": exc.message},
            headers={"Retry-After": str(exc.retry_after)},
        )

    @app.exception_handler(AuthenticationFailedError)
    async def auth_failed_handler(request: Request, exc: AuthenticationFailedError):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": exc.message},
        )

    @app.exception_handler(PermissionDeniedError)
    async def permission_denied_handler(request: Request, exc: PermissionDeniedError):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": exc.message},
        )

    @app.exception_handler(CSRFValidationError)
    async def csrf_validation_handler(request: Request, exc: CSRFValidationError):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": exc.message},
        )

    @app.exception_handler(SCMSException)
    async def generic_scms_handler(request: Request, exc: SCMSException):
        logger.error("Domain exception: %s", exc.message)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": exc.message},
        )

    api_router = APIRouter(prefix=settings.API_V1_PREFIX)

    @api_router.get(
        "/health",
        response_model=HealthResponse,
        summary="Service Health Probe",
        description="Verifies application availability and backend database connectivity without leaking internal metadata.",
    )
    def health_check(response: Response, db: Session = Depends(get_db)) -> HealthResponse:
        is_db_connected = check_db_health(db)
        utc_timestamp = datetime.now(timezone.utc)

        if not is_db_connected:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            return HealthResponse(
                status="degraded",
                database="disconnected",
                version=__version__,
                timestamp=utc_timestamp,
            )

        return HealthResponse(
            status="healthy",
            database="connected",
            version=__version__,
            timestamp=utc_timestamp,
        )

    # Mount all domain routers under /api/v1
    api_router.include_router(auth_router)
    api_router.include_router(members_router)
    api_router.include_router(bookings_router)
    api_router.include_router(shop_router)
    api_router.include_router(cafeteria_router)
    api_router.include_router(finance_router)
    api_router.include_router(crm_router)
    api_router.include_router(search_router)
    api_router.include_router(employees_router)
    api_router.include_router(analytics_router)

    # Mount API router
    app.include_router(api_router)

    @app.get("/", include_in_schema=False)
    def root():
        """Root informational landing endpoint."""
        return {
            "name": settings.APP_NAME,
            "version": __version__,
            "status": "operational",
            "health": f"{settings.API_V1_PREFIX}/health",
        }

    return app


app = create_application()
