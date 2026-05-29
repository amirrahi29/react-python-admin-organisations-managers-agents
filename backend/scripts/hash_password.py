"""Print bcrypt hash for manually inserting an admin row in PostgreSQL."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.security import hash_password


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/hash_password.py <plain_password>")
        sys.exit(1)

    print(hash_password(sys.argv[1]))


if __name__ == "__main__":
    main()
