NAME_PART_MAX_LENGTH = 60
FULL_NAME_MAX_LENGTH = 120


def _strip_name_part(value: object, *, field_name: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} is required")
    stripped = value.strip()
    if not stripped:
        raise ValueError(f"{field_name} is required")
    if len(stripped) > NAME_PART_MAX_LENGTH:
        raise ValueError(f"{field_name} is too long")
    return stripped


def validate_first_name(value: object) -> str:
    first_name = _strip_name_part(value, field_name="First name")
    if len(first_name) < 2:
        raise ValueError("First name must be at least 2 characters")
    return first_name


def validate_last_name(value: object) -> str:
    last_name = _strip_name_part(value, field_name="Last name")
    if len(last_name) < 2:
        raise ValueError("Last name must be at least 2 characters")
    return last_name


def combine_person_name(first_name: str, last_name: str) -> str:
    full_name = f"{first_name.strip()} {last_name.strip()}".strip()
    if len(full_name) > FULL_NAME_MAX_LENGTH:
        raise ValueError("Combined name is too long")
    return full_name


def split_person_name(full_name: str) -> tuple[str, str]:
    parts = full_name.strip().split(None, 1)
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[1]
