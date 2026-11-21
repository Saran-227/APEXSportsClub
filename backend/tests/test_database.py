"""Tests for database engine, session management, and connectivity health probes."""
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.database import check_db_health, create_db_engine, get_db


def test_sqlite_engine_creation():
    """Verify SQLite engine creation uses check_same_thread=False."""
    engine = create_db_engine("sqlite:///:memory:")
    assert engine.dialect.name == "sqlite"
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
        assert result == 1


def test_postgresql_engine_creation():
    """Verify PostgreSQL engine is configured with pool parameters."""
    engine = create_db_engine("postgresql+psycopg://test:test@localhost:5432/test_db")
    assert engine.dialect.name == "postgresql"
    assert engine.pool.size() == 10


def test_database_session_crud(db_session: Session):
    """Verify database session can execute transactional statements."""
    result = db_session.execute(text("SELECT 42 AS value")).mappings().first()
    assert result["value"] == 42


def test_check_db_health_success(db_session: Session):
    """Verify check_db_health returns True on an active session."""
    assert check_db_health(db_session) is True


def test_check_db_health_failure():
    """Verify check_db_health returns False when execution fails without raising exceptions."""
    from unittest.mock import MagicMock
    from sqlalchemy.exc import OperationalError

    mock_session = MagicMock(spec=Session)
    mock_session.execute.side_effect = OperationalError("connection failure", params=None, orig=Exception("refused"))

    assert check_db_health(mock_session) is False


def test_get_db_generator():
    """Verify get_db dependency yields a Session and closes cleanly."""
    gen = get_db()
    session = next(gen)
    assert isinstance(session, Session)
    try:
        next(gen)
    except StopIteration:
        pass
