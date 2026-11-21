"""SQLAlchemy 2.x database engine, base models, and session management."""
import logging
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.core.config import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models across SCMS."""
    pass


def create_db_engine(db_url: str | None = None, fallback_on_unreachable: bool | None = None):
    """Create SQLAlchemy engine with dialect-specific pooling configuration."""
    settings = get_settings()
    target_url = db_url or settings.sqlalchemy_database_url
    if fallback_on_unreachable is None:
        fallback_on_unreachable = db_url is None

    if target_url.startswith("sqlite"):
        # SQLite configuration (primarily for fast, isolated unit/integration tests)
        return create_engine(
            target_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool if ":memory:" in target_url else None,
        )

    # PostgreSQL configuration
    pg_engine = create_engine(
        target_url,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_pre_ping=settings.DB_POOL_PRE_PING,
    )

    if fallback_on_unreachable:
        try:
            with pg_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return pg_engine
        except Exception as exc:
            logger.warning(
                "PostgreSQL target '%s' unreachable (%s). Using SQLite fallback for local development.",
                target_url.split("@")[-1] if "@" in target_url else target_url,
                type(exc).__name__,
            )
            db_path = Path(__file__).resolve().parents[3] / "scms.db"
            return create_engine(
                f"sqlite:///{db_path}",
                connect_args={"check_same_thread": False},
            )

    return pg_engine


# Default engine and sessionmaker
engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency provider that yields a SQLAlchemy database session per request."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_health(db: Session) -> bool:
    """Execute lightweight verification query to validate database availability."""
    try:
        db.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning("Database health probe check failed: %s", type(exc).__name__)
        return False
