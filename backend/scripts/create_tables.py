"""Create database tables only — no data inserted."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import app.models  # noqa: F401
from app.core.database import Base, engine
from app.extensions.lifespan import _migrate_admin_is_active, _migrate_admin_profile_columns


def main() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_admin_is_active()
    _migrate_admin_profile_columns()
    from app.extensions.lifespan import (
        _migrate_agent_call_mode_column,
        _migrate_agent_manager_required,
        _migrate_agent_type_column,
        _migrate_updated_at_columns,
    )

    _migrate_agent_manager_required()
    _migrate_updated_at_columns()
    _migrate_agent_type_column()
    _migrate_agent_call_mode_column()

    tables = sorted(Base.metadata.tables.keys())
    print("Tables created (or already exist):")
    for name in tables:
        print(f"  - {name}")
    print("\nNo data was inserted. Add records manually when ready.")


if __name__ == "__main__":
    main()
