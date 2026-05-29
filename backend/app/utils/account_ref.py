import re

MANAGER_PREFIX = "AVM"
AGENT_PREFIX = "AVA"
ACCOUNT_REF_PATTERN = re.compile(r"^(AVM|AVA)-(\d{8})$", re.IGNORECASE)


def format_account_ref(*, role: str, member_id: int) -> str:
    prefix = MANAGER_PREFIX if role.lower() == "manager" else AGENT_PREFIX
    return f"{prefix}-{member_id:08d}"


def parse_account_ref(account_id: str | None) -> tuple[str, int]:
    if not account_id or not str(account_id).strip():
        raise ValueError("Invalid account ID")
    match = ACCOUNT_REF_PATTERN.match(account_id.strip().upper())
    if not match:
        raise ValueError("Invalid account ID")
    prefix, raw_id = match.groups()
    role = "manager" if prefix == MANAGER_PREFIX else "agent"
    return role, int(raw_id)
