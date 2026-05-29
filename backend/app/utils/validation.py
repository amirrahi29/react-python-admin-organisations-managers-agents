import re

EMAIL_MAX_LENGTH = 254
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128

EMAIL_PATTERN = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)


def normalize_email(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("Email is required")

    email = value.strip().lower()
    if not email:
        raise ValueError("Email is required")
    if len(email) > EMAIL_MAX_LENGTH:
        raise ValueError("Email is too long")
    if not EMAIL_PATTERN.fullmatch(email):
        raise ValueError("Please enter a valid email address")
    return email


def validate_login_password(value: object) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError("Password is required")
    if len(value) > PASSWORD_MAX_LENGTH:
        raise ValueError("Password is too long")
    return value


def validate_new_password(value: object) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError("Password is required")
    if len(value) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
    if len(value) > PASSWORD_MAX_LENGTH:
        raise ValueError(f"Password must be at most {PASSWORD_MAX_LENGTH} characters")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must include at least one uppercase letter")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must include at least one lowercase letter")
    if not re.search(r"\d", value):
        raise ValueError("Password must include at least one number")
    if not re.search(r"[^A-Za-z0-9]", value):
        raise ValueError("Password must include at least one special character")
    return value
