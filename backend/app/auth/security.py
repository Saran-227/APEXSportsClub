"""Cryptographic security utilities for password hashing, session tokens, and CSRF."""
import hashlib
import secrets
from typing import Tuple

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# Configure Argon2id password hasher according to OWASP guidelines
_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MiB
    parallelism=1,
    hash_len=32,
)


def hash_password(plaintext_password: str) -> str:
    """Hash plaintext password using Argon2id."""
    return _hasher.hash(plaintext_password)


def verify_password(hashed_password: str, plaintext_password: str) -> bool:
    """Verify plaintext password against stored Argon2id hash."""
    try:
        return _hasher.verify(hashed_password, plaintext_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def generate_session_token() -> str:
    """Generate a high-entropy, cryptographically secure session token."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Compute SHA-256 hash of raw session token for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_csrf_token() -> str:
    """Generate a cryptographically random anti-CSRF token."""
    return secrets.token_hex(32)


def verify_csrf_token(header_token: str | None, cookie_token: str | None) -> bool:
    """Perform constant-time comparison of CSRF header against cookie token."""
    if not header_token or not cookie_token:
        return False
    return secrets.compare_digest(header_token.strip(), cookie_token.strip())
