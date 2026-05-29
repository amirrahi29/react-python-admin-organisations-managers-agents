"""Test PostgreSQL connection using backend/.env settings."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import create_engine, text

from app.core.config import ENV_FILE, settings


def main() -> None:
    print(f"Using env file: {ENV_FILE}")
    print(f"Host: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}")
    print(f"Database: {settings.POSTGRES_DB}")
    print(f"User: {settings.POSTGRES_USER}")
    print(f"SSL mode: {settings.effective_sslmode}")

    try:
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        with engine.connect() as conn:
            version = conn.execute(text("SELECT version()")).scalar()
            print("Connection OK")
            print(version.split(",")[0])
    except Exception as exc:
        print("Connection FAILED")
        print(str(exc).split("\n")[0])
        print("\nFix backend/.env with your real PostgreSQL host/user/password, then run again.")


if __name__ == "__main__":
    main()
