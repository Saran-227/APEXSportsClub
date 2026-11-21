"""Base application exception hierarchy for SCMS."""
from typing import Any, Dict, Optional


class SCMSException(Exception):
    """Base exception class for all domain and operational exceptions in SCMS."""

    def __init__(self, message: str = "An internal error occurred", details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class DatabaseConnectionError(SCMSException):
    """Raised when communication with the database fails or times out."""

    def __init__(self, message: str = "Database connection unavailable", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, details=details)


class ConfigurationError(SCMSException):
    """Raised when application configuration or environment is invalid."""

    def __init__(self, message: str = "Invalid application configuration", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, details=details)


class EntityNotFoundError(SCMSException):
    """Raised when a requested resource or record cannot be found."""

    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            message=f"{entity_name} with identifier '{entity_id}' was not found.",
            details={"entity_name": entity_name, "entity_id": str(entity_id)},
        )


class EntityConflictError(SCMSException):
    """Raised when an operation would violate unique constraints or cause conflicts."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, details=details)


class AuthenticationFailedError(SCMSException):
    """Raised when authentication credentials are invalid or missing."""

    def __init__(self, message: str = "Invalid email or password", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, details=details)


class PermissionDeniedError(SCMSException):
    """Raised when an authenticated user lacks required permissions."""

    def __init__(self, message: str = "Permission denied", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, details=details)


class CSRFValidationError(SCMSException):
    """Raised when CSRF token verification fails."""

    def __init__(self, message: str = "CSRF token validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, details=details)


class RateLimitExceededError(SCMSException):
    """Raised when an operation exceeds allowed rate limits."""

    def __init__(self, retry_after: int = 900, message: str = "Too many attempts. Please try again later."):
        super().__init__(message=message, details={"retry_after": retry_after})
        self.retry_after = retry_after
