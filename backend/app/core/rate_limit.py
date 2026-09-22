"""In-memory sliding-window rate limiting for the login endpoint."""

import math
import time
from collections import defaultdict, deque
from collections.abc import Iterator
from threading import Lock


class SlidingWindowLimiter:
    """Counts events per key and rejects once the window is saturated.

    Bonafide for the single-node deployment this platform targets; a distributed
    limiter (Redis, or a load-balancer layer) can replace it later without API
    changes.
    """

    def __init__(self, max_events: int, window_seconds: int) -> None:
        if max_events <= 0 or window_seconds <= 0:
            raise ValueError("max_events and window_seconds must be positive")
        self._max_events = max_events
        self._window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _prune(self, events: deque[float], now: float) -> None:
        while events and now - events[0] > self._window_seconds:
            events.popleft()

    def allow(self, key: str) -> bool:
        """Record an event for ``key`` and report whether it may proceed."""
        now = time.monotonic()
        with self._lock:
            events = self._events[key]
            self._prune(events, now)
            if len(events) >= self._max_events:
                return False
            events.append(now)
            return True

    def reset(self, key: str) -> None:
        """Clear all recorded events for ``key`` (e.g. after a successful login)."""
        with self._lock:
            self._events.pop(key, None)

    def retry_after_seconds(self, key: str) -> int:
        """Seconds until the oldest event for ``key`` leaves the window."""
        now = time.monotonic()
        with self._lock:
            events = self._events.get(key)
            if not events:
                return 0
            self._prune(events, now)
            if not events:
                return 0
            oldest = events[0]
        return max(1, math.ceil(self._window_seconds - (now - oldest)))

    def blocked_keys(self) -> Iterator[str]:
        """Yield keys currently over the limit (test/observability helper)."""
        now = time.monotonic()
        with self._lock:
            for key, events in list(self._events.items()):
                self._prune(events, now)
                if len(events) >= self._max_events:
                    yield key
