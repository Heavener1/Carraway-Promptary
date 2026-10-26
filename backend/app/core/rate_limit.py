from collections import deque
from time import monotonic


class SlidingWindowLimiter:
    """Process-local limiter for public, cost-bearing endpoints.

    A single process covers local development and small deployments. For
    multi-worker production deployments, move this state to Redis.
    """

    def __init__(self, *, limit: int, window_seconds: float = 60.0) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = {}

    def check(self, key: str) -> tuple[bool, int]:
        now = monotonic()
        cutoff = now - self.window_seconds
        hits = self._hits.setdefault(key, deque())

        while hits and hits[0] <= cutoff:
            hits.popleft()

        if len(hits) >= self.limit:
            retry_after = max(1, int(self.window_seconds - (now - hits[0])) + 1)
            return False, retry_after

        hits.append(now)
        if len(self._hits) > 2048:
            self._prune(cutoff)
        return True, 0

    def _prune(self, cutoff: float) -> None:
        stale = []
        for key, hits in self._hits.items():
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if not hits:
                stale.append(key)
        for key in stale:
            self._hits.pop(key, None)
