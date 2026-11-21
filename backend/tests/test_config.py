"""Tests for configuration parsing, validation, and database URL generation."""
import pytest
from pydantic import ValidationError

from backend.app.core.config import Settings


def test_default_settings():
    """Verify default configuration attributes are accurately populated."""
    settings = Settings()
    assert settings.APP_NAME == "Sports Club Management System"
    assert settings.POSTGRES_DB == "sports_club_db"
    assert settings.POSTGRES_PORT == 5432
    assert settings.DB_POOL_SIZE == 10
    assert settings.DB_MAX_OVERFLOW == 20
    assert settings.API_V1_PREFIX == "/api/v1"


def test_sqlalchemy_database_url_generation():
    """Verify connection URL is properly formatted for psycopg3 driver."""
    settings = Settings(
        DATABASE_URL=None,
        POSTGRES_SERVER="db.internal",
        POSTGRES_PORT=5432,
        POSTGRES_DB="test_db",
        POSTGRES_USER="test_user",
        POSTGRES_PASSWORD="secure_password",
    )
    expected_url = "postgresql+psycopg://test_user:secure_password@db.internal:5432/test_db"
    assert settings.sqlalchemy_database_url == expected_url


def test_database_url_override():
    """Verify DATABASE_URL override takes precedence over individual credentials."""
    override_url = "postgresql+psycopg://custom_admin:secret@pgcluster:6432/production_scms"
    settings = Settings(DATABASE_URL=override_url)
    assert settings.sqlalchemy_database_url == override_url


def test_invalid_port_validation():
    """Verify invalid port numbers raise validation errors."""
    with pytest.raises(ValidationError):
        Settings(POSTGRES_PORT=70000)

    with pytest.raises(ValidationError):
        Settings(POSTGRES_PORT=-1)
