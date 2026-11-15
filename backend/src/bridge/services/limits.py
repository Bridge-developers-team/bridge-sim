"""In-memory request limits. They protect the AI bill, not security: one
server instance (Render free runs exactly one), so memory is the whole state,
and a restart forgets it.

- per client: N calls in a sliding window (spreads a shared demo fairly);
- per day: a hard cap on all live AI calls (a spend ceiling in code, on top
  of the monthly limit set in the Anthropic Console). It counts every call
  the writer makes to Claude, not requests: one pay lookup is several calls.
"""

from __future__ import annotations

import time
from collections import deque
from collections.abc import Callable
from datetime import UTC, datetime

Clock = Callable[[], float]


class SlidingWindow:
    def __init__(self, limit: int, window_seconds: float, clock: Clock = time.monotonic) -> None:
        self.limit = limit
        self.window = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._checks = 0

    def allow(self, key: str) -> bool:
        """Count one hit for `key` and say whether it is within the limit."""
        now = self._clock()
        self._checks += 1
        if self._checks % 500 == 0:
            self._sweep(now)
        hits = self._hits.setdefault(key, deque())
        while hits and now - hits[0] >= self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True

    def _sweep(self, now: float) -> None:
        """Forget clients whose hits have all expired, so memory stays flat."""
        stale = [k for k, h in self._hits.items() if not h or now - h[-1] >= self.window]
        for k in stale:
            del self._hits[k]

    def __len__(self) -> int:
        return len(self._hits)


def _utc_day() -> str:
    return datetime.now(UTC).date().isoformat()


class DailyBudget:
    def __init__(self, limit: int, today: Callable[[], str] = _utc_day) -> None:
        self.limit = limit
        self._today = today
        self._day = today()
        self._used = 0

    def _roll(self) -> None:
        day = self._today()
        if day != self._day:
            self._day, self._used = day, 0

    def take(self) -> bool:
        """Spend one call; False (and nothing spent) when today's cap is reached."""
        self._roll()
        if self._used >= self.limit:
            return False
        self._used += 1
        return True

    def exhausted(self) -> bool:
        self._roll()
        return self._used >= self.limit
