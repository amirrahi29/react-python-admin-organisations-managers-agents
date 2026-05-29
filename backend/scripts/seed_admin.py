"""Create admin in PostgreSQL `admin` table."""

import sys
from getpass import getpass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal
from app.models.admin import Admin
from app.services.auth import create_admin


def main() -> None:
    email = input("Admin email: ").strip()
    name = input("Admin name: ").strip()
    password = getpass("Admin password: ").strip()
    confirm = getpass("Confirm password: ").strip()

    if not email or not password or not name:
        print("Email, name, and password are required.")
        sys.exit(1)

    if password != confirm:
        print("Passwords do not match.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(Admin).filter(Admin.email == email.lower()).first()
        if existing:
            print(f"Admin already exists: {existing.email}")
            sys.exit(1)

        admin = create_admin(db, email=email, password=password, name=name)
        print(f"Admin created in database: {admin.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
