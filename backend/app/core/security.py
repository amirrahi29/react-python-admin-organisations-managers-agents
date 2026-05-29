import bcrypt
from werkzeug.security import check_password_hash


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def is_bcrypt_hash(password_hash: str) -> bool:
    return password_hash.startswith("$2")


def verify_password(plain_password: str, password_hash: str) -> bool:
    if not plain_password or not password_hash:
        return False
    if is_bcrypt_hash(password_hash):
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                password_hash.encode("utf-8"),
            )
        except ValueError:
            return False
    try:
        return check_password_hash(password_hash, plain_password)
    except ValueError:
        return False


def upgrade_password_hash_if_legacy(user, plain_password: str) -> None:
    if user and not is_bcrypt_hash(user.password_hash):
        user.password_hash = hash_password(plain_password)
