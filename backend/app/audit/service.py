"""Service layer for recording security and operational audit logs."""
import logging
import uuid
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.app.audit.models import AuditLog

logger = logging.getLogger("scms.audit")

# Redacted keys to prevent sensitive data leaks in audit details
SENSITIVE_KEYS = {"password", "token", "session_token", "hashed_password", "secret"}


def sanitize_details(details: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Remove any sensitive fields before persisting audit details."""
    if not details:
        return {}
    sanitized = {}
    for k, v in details.items():
        if any(sens in k.lower() for sens in SENSITIVE_KEYS):
            sanitized[k] = "[REDACTED]"
        else:
            sanitized[k] = v
    return sanitized


def create_audit_log(
    db: Session,
    event_type: str,
    user_id: Optional[uuid.UUID] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """Record an audit log entry to the database."""
    clean_details = sanitize_details(details)
    entry = AuditLog(
        id=uuid.uuid4(),
        user_id=user_id,
        event_type=event_type,
        ip_address=ip_address,
        user_agent=user_agent[:500] if user_agent else None,
        details=clean_details,
    )
    db.add(entry)
    try:
        db.commit()
        db.refresh(entry)
    except Exception as exc:
        db.rollback()
        logger.error("Failed to commit audit log entry (%s): %s", event_type, exc)
    return entry
