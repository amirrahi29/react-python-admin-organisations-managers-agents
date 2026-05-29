"""Create database tables only — no data inserted."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.extensions.lifespan import ensure_app_schema


def main() -> None:
    ensure_app_schema()
    print("Schema ready. No data was inserted. Add records manually when ready.")


if __name__ == "__main__":
    main()
