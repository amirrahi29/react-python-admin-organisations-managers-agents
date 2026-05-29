"""Block or unblock an admin by email (is_active: 0 = blocked, 1 = active)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal
from app.models.admin import ADMIN_ACTIVE, ADMIN_BLOCKED
from app.services.auth import set_admin_active


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python scripts/set_admin_status.py <email> <0|1>")
        print("  1 = active (unblock)")
        print("  0 = blocked")
        sys.exit(1)

    email = sys.argv[1].strip()
    status = sys.argv[2].strip()

    if status not in {"0", "1"}:
        print("Status must be 0 (blocked) or 1 (active).")
        sys.exit(1)

    active = status == "1"
    db = SessionLocal()
    try:
        admin = set_admin_active(db, email=email, active=active)
        if not admin:
            print(f"Admin not found: {email}")
            sys.exit(1)

        label = "active" if admin.is_active == ADMIN_ACTIVE else "blocked"
        print(f"{admin.email} is now {label} (is_active={admin.is_active}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
