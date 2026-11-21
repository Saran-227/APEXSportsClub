"""Thread-safe sliding window rate limiter for login protection."""
import threading
import time
from collections import defaultdict
from typing import Dict, List, Tuple


class LoginRateLimiter:
    """In-memory rate limiter tracking failed authentication attempts per client."""

    def __init__(self, max_attempts: int = 5, window_seconds: int = 900):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._lock = threading.Lock()
        self._attempts: Dict[str, List[float]] = defaultdict(list)

    def check_rate_limit(self, key: str) -> Tuple[bool, int]:
        """Check if client has exceeded allowed failed login attempts.

        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        now = time.time()
        cutoff = now - self.window_seconds

        with self._lock:
            # Purge expired timestamps for this key
            self._attempts[key] = [ts for ts in self._attempts[key] if ts > cutoff]
            current_failures = len(self._attempts[key])

            if current_failures >= self.max_attempts:
                oldest_in_window = self._attempts[key][0]
                retry_after = max(1, int(oldest_in_window + self.window_seconds - now))
                return False, retry_after

            return True, 0

    def record_failure(self, key: str) -> None:
        """Record a failed login attempt for the given key."""
        now = time.time()
        with self._lock:
            self._attempts[key].append(now)

    def reset(self, key: str) -> None:
        """Reset failed login count upon successful authentication."""
        with self._lock:
            self._attempts.pop(key, None)

    def clear_all(self) -> None:
        """Clear all tracked attempts (useful for testing)."""
        with self._lock:
            self._attempts.clear()


# Global rate limiter instance
login_rate_limiter = LoginRateLimiter()
