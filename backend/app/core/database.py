import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

_STATEMENT_TIMEOUT_MS = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "30000"))
_POOL_RECYCLE_SECONDS = int(os.getenv("DB_POOL_RECYCLE_SECONDS", "1800"))
_db_url = settings.database_url
_is_postgres = _db_url.startswith("postgres") or "postgresql" in _db_url

_connect_args: dict = {}
if _is_postgres:
    _connect_args["options"] = f"-c statement_timeout={_STATEMENT_TIMEOUT_MS}"
    _connect_args["connect_timeout"] = int(os.getenv("DB_CONNECT_TIMEOUT", "10"))

engine = create_engine(
    _db_url,
    pool_pre_ping=True,
    pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
    pool_recycle=_POOL_RECYCLE_SECONDS,
    pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
    pool_use_lifo=os.getenv("DB_POOL_LIFO", "1").strip().lower() in {"1", "true", "yes"},
    connect_args=_connect_args,
    future=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
