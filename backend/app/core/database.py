from collections.abc import Generator
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

_STATEMENT_TIMEOUT_MS = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "30000"))
_POOL_RECYCLE_SECONDS = int(os.getenv("DB_POOL_RECYCLE_SECONDS", "1800"))
_db_url = settings.database_url
_is_postgres = _db_url.startswith("postgres") or "postgresql" in _db_url

_connect_args: dict = {}
if _is_postgres:
    # ``options`` is the canonical way to set a session-wide statement timeout
    # on psycopg/psycopg2. Cap at 30s so a single runaway query can't choke a
    # pool slot indefinitely.
    _connect_args["options"] = f"-c statement_timeout={_STATEMENT_TIMEOUT_MS}"

engine = create_engine(
    _db_url,
    pool_pre_ping=True,
    pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
    pool_recycle=_POOL_RECYCLE_SECONDS,
    connect_args=_connect_args,
    future=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
