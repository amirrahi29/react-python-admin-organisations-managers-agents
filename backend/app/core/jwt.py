import secrets
from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings
from app.core.constants import ROLE_ADMIN

ALGORITHM = "HS256"


def create_access_token(user_id: int, role: str = ROLE_ADMIN) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(days=settings.JWT_EXPIRE_DAYS),
        "jti": secrets.token_urlsafe(16),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str, *, expected_role: str | None = ROLE_ADMIN) -> int | None:
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
        if payload.get("type") != "access":
            return None
        role = payload.get("role", ROLE_ADMIN)
        if expected_role and role != expected_role:
            return None
        return int(payload["sub"])
    except (jwt.PyJWTError, ValueError, TypeError):
        return None
