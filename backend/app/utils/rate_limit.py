"""Tiny in-memory IP rate limiter for auth endpoints.

Single-process only; for multi-worker production use a shared store
(Redis) or `Flask-Limiter`. Designed to be drop-in via decorator so
that the auth flow becomes safer immediately, while leaving room for
a heavier replacement later.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from functools import wraps
from typing import Callable

from flask import Response, jsonify, request


_lock = threading.Lock()
_buckets: dict[str, deque[float]] = {}


def _client_key() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    return forwarded or (request.remote_addr or "unknown")


def _prune(window: deque[float], now: float, window_seconds: float) -> None:
    cutoff = now - window_seconds
    while window and window[0] < cutoff:
        window.popleft()


def rate_limit(*, key: str, max_requests: int, window_seconds: float) -> Callable:
    """Allow at most ``max_requests`` per IP per ``window_seconds`` for ``key``.

    Returns 429 with ``Retry-After`` header when exceeded.
    """

    def decorator(view: Callable) -> Callable:
        @wraps(view)
        def wrapper(*args, **kwargs):
            bucket_id = f"{key}:{_client_key()}"
            now = time.monotonic()

            with _lock:
                window = _buckets.setdefault(bucket_id, deque())
                _prune(window, now, window_seconds)
                if len(window) >= max_requests:
                    retry_after = max(1, int(window_seconds - (now - window[0])))
                    response: Response = jsonify(
                        {"detail": "Too many requests. Please slow down."}
                    )
                    response.status_code = 429
                    response.headers["Retry-After"] = str(retry_after)
                    return response
                window.append(now)

            return view(*args, **kwargs)

        return wrapper

    return decorator
