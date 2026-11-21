from functools import lru_cache
from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings loaded from environment or .env file."""

    # Application
    APP_NAME: str = Field(default="Sports Club Management System")
    APP_ENV: str = Field(default="development")
    APP_DEBUG: bool = Field(default=False)
    API_V1_PREFIX: str = Field(default="/api/v1")
    SECRET_KEY: str = Field(
        default="insecure_change_this_to_a_cryptographically_secure_key_32_bytes_min"
    )

    # PostgreSQL Database
    POSTGRES_SERVER: str = Field(default="localhost")
    POSTGRES_PORT: int = Field(default=5432)
    POSTGRES_DB: str = Field(default="sports_club_db")
    POSTGRES_USER: str = Field(default="scms_user")
    POSTGRES_PASSWORD: str = Field(default="scms_secure_password")

    # Connection Pool Settings
    DB_POOL_SIZE: int = Field(default=10)
    DB_MAX_OVERFLOW: int = Field(default=20)
    DB_POOL_TIMEOUT: int = Field(default=30)
    DB_POOL_PRE_PING: bool = Field(default=True)

    # Direct database URL override (optional)
    DATABASE_URL: Optional[str] = Field(default=None)

    # Session & Cookie Security
    SESSION_COOKIE_NAME: str = Field(default="scms_session")
    SESSION_EXPIRE_SECONDS: int = Field(default=604800)  # 7 days absolute expiry
    SESSION_IDLE_TIMEOUT_SECONDS: int = Field(default=1800)  # 30 minutes inactivity timeout
    COOKIE_SECURE: bool = Field(default=False)  # Set to True in production HTTPS
    COOKIE_SAMESITE: str = Field(default="lax")  # "lax", "strict", or "none"
    COOKIE_DOMAIN: Optional[str] = Field(default=None)

    # CSRF Protection
    CSRF_COOKIE_NAME: str = Field(default="scms_csrf_token")
    CSRF_HEADER_NAME: str = Field(default="X-CSRF-Token")

    # Rate Limiting & Throttling
    LOGIN_RATE_LIMIT_ATTEMPTS: int = Field(default=5)
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = Field(default=900)  # 15 minutes

    # CORS Allowed Origins
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ]
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def sqlalchemy_database_url(self) -> str:
        """Construct or return the validated SQLAlchemy database connection URL.

        Uses psycopg 3 driver (postgresql+psycopg://).
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @field_validator("POSTGRES_PORT")
    @classmethod
    def validate_port(cls, v: int) -> int:
        if not (1 <= v <= 65535):
            raise ValueError(f"Port must be between 1 and 65535, got {v}")
        return v


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton instance."""
    return Settings()
