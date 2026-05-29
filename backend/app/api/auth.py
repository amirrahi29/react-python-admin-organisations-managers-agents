import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.api.deps import get_db
from app.core.constants import JWT_COOKIE_NAME, ROLE_ADMIN, ROLE_AGENT, ROLE_MANAGER, ROLE_ORGANIZATION
from app.core.jwt import create_access_token, decode_access_token
from app.extensions.lifespan import ensure_db_ready
from app.schemas.auth import (
    AdminResponse,
    AgentLoginRequest,
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
)
from app.services.auth import (
    authenticate_admin,
    authenticate_agent,
    authenticate_manager,
    authenticate_organization,
    change_admin_password,
    change_agent_password,
    change_manager_password,
    change_organization_password,
    create_admin,
    get_admin_by_id,
    get_agent_by_id,
    get_manager_by_id,
    get_active_organization_by_id,
    serialize_agent_session,
    serialize_manager_session,
    serialize_organization_session,
    update_admin_profile,
    update_agent_profile,
    update_manager_profile,
    update_organization_profile,
)
from app.services.organizations import is_organization_email_in_use
from app.services.email import send_admin_welcome_email, send_password_changed_email
from app.models.attendance import USER_TYPE_AGENT, USER_TYPE_MANAGER
from app.services.attendance import record_login, record_logout
from app.utils.rate_limit import rate_limit

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
logger = logging.getLogger(__name__)

# Auth throttles (per-IP, in-memory). Adjust as the deployment topology grows.
_LOGIN_LIMIT = dict(max_requests=10, window_seconds=60)
_REGISTER_LIMIT = dict(max_requests=5, window_seconds=3600)
_PASSWORD_CHANGE_LIMIT = dict(max_requests=8, window_seconds=300)


def _client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    return forwarded or request.remote_addr


def _now_label() -> str:
    return datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")


def _access_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.removeprefix("Bearer ").strip()
    return request.cookies.get(JWT_COOKIE_NAME)


def _db_unavailable_response():
    _, error = ensure_db_ready()
    return jsonify({"detail": error or "Database not connected"}), 503


def _record_auth_attendance(user_type: str, user_id: int, action: str) -> bool:
    # ``run_pending_migrations`` already runs at app startup (see
    # ``app/__init__.py`` -> ``ensure_app_schema``) and is idempotent; calling
    # it again here added redundant work to every login/logout request.
    try:
        with get_db() as db:
            if action == "login":
                record_login(db, user_type, user_id)
            else:
                return record_logout(db, user_type, user_id)
        return True
    except Exception:
        logger.exception(
            "Failed to record attendance %s for %s:%s",
            action,
            user_type,
            user_id,
        )
        return False


def _login_response(*, user_key: str, user_payload: dict, user_id: int, role: str):
    access_token = create_access_token(user_id, role)
    return jsonify(
        {
            user_key: user_payload,
            "access_token": access_token,
            "token_type": "bearer",
        }
    )


@auth_bp.post("/login")
@rate_limit(key="auth.login.admin", **_LOGIN_LIMIT)
def login():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    try:
        payload = LoginRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        admin, auth_error = authenticate_admin(db, payload.email, payload.password)
        if auth_error == "blocked":
            return jsonify({"detail": "Admin account is blocked"}), 403
        if not admin:
            return jsonify({"detail": "Invalid email or password"}), 401

        return _login_response(
            user_key="admin",
            user_payload=AdminResponse.model_validate(admin).model_dump(mode="json"),
            user_id=admin.id,
            role=ROLE_ADMIN,
        )


@auth_bp.post("/register")
@rate_limit(key="auth.register", **_REGISTER_LIMIT)
def register():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    try:
        payload = RegisterRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        if is_organization_email_in_use(db, payload.email):
            return jsonify({"detail": "Admin with this email already exists"}), 409

        admin = create_admin(
            db,
            email=payload.email,
            password=payload.password,
            name=payload.name,
        )
        email_sent = send_admin_welcome_email(to_email=admin.email, name=admin.name)
        response, status = _login_response(
            user_key="admin",
            user_payload=AdminResponse.model_validate(admin).model_dump(mode="json"),
            user_id=admin.id,
            role=ROLE_ADMIN,
        ), 201
        data = response.get_json()
        data["email_sent"] = email_sent
        return jsonify(data), status


@auth_bp.get("/me")
def me():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin_id = decode_access_token(_access_token() or "", expected_role=ROLE_ADMIN)
    if not admin_id:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        admin = get_admin_by_id(db, admin_id)
        if not admin:
            return jsonify({"detail": "Not authenticated"}), 401

        return jsonify(AdminResponse.model_validate(admin).model_dump(mode="json"))


@auth_bp.patch("/profile")
def update_profile():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin_id = decode_access_token(_access_token() or "", expected_role=ROLE_ADMIN)
    if not admin_id:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        payload = UpdateProfileRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        admin = update_admin_profile(
            db,
            admin_id,
            name=payload.name,
            phone=payload.phone,
            job_title=payload.job_title,
        )
        if not admin:
            return jsonify({"detail": "Not authenticated"}), 401

        return jsonify(
            {
                "admin": AdminResponse.model_validate(admin).model_dump(mode="json"),
                "message": "Profile updated successfully",
            }
        )


@auth_bp.post("/logout")
def logout():
    return jsonify({"message": "Logged out"})


@auth_bp.post("/manager/login")
@rate_limit(key="auth.login.manager", **_LOGIN_LIMIT)
def manager_login():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    try:
        payload = LoginRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        manager, auth_error = authenticate_manager(db, payload.email, payload.password)
        if auth_error == "blocked":
            return jsonify({"detail": "Manager account is blocked"}), 403
        if not manager:
            return jsonify({"detail": "Invalid email or password"}), 401

        _record_auth_attendance(USER_TYPE_MANAGER, manager.id, "login")
        return _login_response(
            user_key="manager",
            user_payload=serialize_manager_session(manager),
            user_id=manager.id,
            role=ROLE_MANAGER,
        )


@auth_bp.get("/manager/me")
def manager_me():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager_id = decode_access_token(_access_token() or "", expected_role=ROLE_MANAGER)
    if not manager_id:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        manager = get_manager_by_id(db, manager_id)
        if not manager:
            return jsonify({"detail": "Not authenticated"}), 401

        return jsonify(serialize_manager_session(manager))


@auth_bp.patch("/manager/profile")
def manager_update_profile():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager_id = decode_access_token(_access_token() or "", expected_role=ROLE_MANAGER)
    if not manager_id:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        payload = UpdateProfileRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        manager = update_manager_profile(
            db,
            manager_id,
            name=payload.name,
            phone=payload.phone,
            job_title=payload.job_title,
        )
        if not manager:
            return jsonify({"detail": "Not authenticated"}), 401

        return jsonify(
            {
                "manager": serialize_manager_session(manager),
                "message": "Profile updated successfully",
            }
        )


@auth_bp.post("/manager/logout")
def manager_logout():
    manager_id = decode_access_token(_access_token() or "", expected_role=ROLE_MANAGER)
    if manager_id:
        _record_auth_attendance(USER_TYPE_MANAGER, manager_id, "logout")
    return jsonify({"message": "Logged out"})


@auth_bp.post("/agent/login")
@rate_limit(key="auth.login.agent", **_LOGIN_LIMIT)
def agent_login():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    try:
        payload = AgentLoginRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        agent, auth_error = authenticate_agent(db, payload.email, payload.password)
        if auth_error == "blocked":
            return jsonify({"detail": "Agent account is blocked"}), 403
        if not agent:
            return jsonify({"detail": "Invalid email or password"}), 401

        _record_auth_attendance(USER_TYPE_AGENT, agent.id, "login")
        return _login_response(
            user_key="agent",
            user_payload=serialize_agent_session(agent),
            user_id=agent.id,
            role=ROLE_AGENT,
        )


@auth_bp.get("/agent/me")
def agent_me():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    agent_id = decode_access_token(_access_token() or "", expected_role=ROLE_AGENT)
    if not agent_id:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        agent = get_agent_by_id(db, agent_id)
        if not agent:
            return jsonify({"detail": "Not authenticated"}), 401

        return jsonify(serialize_agent_session(agent))


@auth_bp.patch("/agent/profile")
def agent_update_profile():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    agent_id = decode_access_token(_access_token() or "", expected_role=ROLE_AGENT)
    if not agent_id:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        payload = UpdateProfileRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        agent = update_agent_profile(
            db,
            agent_id,
            name=payload.name,
            phone=payload.phone,
            job_title=payload.job_title,
        )
        if not agent:
            return jsonify({"detail": "Not authenticated"}), 401

        return jsonify(
            {
                "agent": serialize_agent_session(agent),
                "message": "Profile updated successfully",
            }
        )


@auth_bp.post("/agent/logout")
def agent_logout():
    agent_id = decode_access_token(_access_token() or "", expected_role=ROLE_AGENT)
    if agent_id:
        _record_auth_attendance(USER_TYPE_AGENT, agent_id, "logout")
    return jsonify({"message": "Logged out"})


# ── Password change endpoints ─────────────────────────────────────────────────


def _parse_change_password() -> ChangePasswordRequest | tuple:
    try:
        return ChangePasswordRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422


@auth_bp.post("/change-password")
@rate_limit(key="auth.password.admin", **_PASSWORD_CHANGE_LIMIT)
def change_password_admin():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    admin_id = decode_access_token(_access_token() or "", expected_role=ROLE_ADMIN)
    if not admin_id:
        return jsonify({"detail": "Not authenticated"}), 401

    parsed = _parse_change_password()
    if not isinstance(parsed, ChangePasswordRequest):
        return parsed

    with get_db() as db:
        admin, error = change_admin_password(
            db,
            admin_id,
            current_password=parsed.current_password,
            new_password=parsed.new_password,
        )
        if error == "not_found" or not admin:
            return jsonify({"detail": "Not authenticated"}), 401
        if error == "invalid":
            return jsonify({"detail": "Current password is incorrect"}), 400

        try:
            send_password_changed_email(
                role_label="Admin",
                to_email=admin.email,
                name=admin.name,
                member_id=admin.id,
                when_label=_now_label(),
                ip_address=_client_ip(),
            )
        except Exception:
            logger.exception("Failed to dispatch admin password change email")

        return jsonify({"message": "Password changed successfully"})


@auth_bp.post("/manager/change-password")
@rate_limit(key="auth.password.manager", **_PASSWORD_CHANGE_LIMIT)
def change_password_manager():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    manager_id = decode_access_token(_access_token() or "", expected_role=ROLE_MANAGER)
    if not manager_id:
        return jsonify({"detail": "Not authenticated"}), 401

    parsed = _parse_change_password()
    if not isinstance(parsed, ChangePasswordRequest):
        return parsed

    with get_db() as db:
        manager, error = change_manager_password(
            db,
            manager_id,
            current_password=parsed.current_password,
            new_password=parsed.new_password,
        )
        if error == "not_found" or not manager:
            return jsonify({"detail": "Not authenticated"}), 401
        if error == "invalid":
            return jsonify({"detail": "Current password is incorrect"}), 400

        try:
            send_password_changed_email(
                role_label="Manager",
                to_email=manager.email,
                name=manager.name,
                member_id=manager.id,
                when_label=_now_label(),
                ip_address=_client_ip(),
            )
        except Exception:
            logger.exception("Failed to dispatch manager password change email")

        return jsonify({"message": "Password changed successfully"})


@auth_bp.post("/agent/change-password")
@rate_limit(key="auth.password.agent", **_PASSWORD_CHANGE_LIMIT)
def change_password_agent():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    agent_id = decode_access_token(_access_token() or "", expected_role=ROLE_AGENT)
    if not agent_id:
        return jsonify({"detail": "Not authenticated"}), 401

    parsed = _parse_change_password()
    if not isinstance(parsed, ChangePasswordRequest):
        return parsed

    with get_db() as db:
        agent, error = change_agent_password(
            db,
            agent_id,
            current_password=parsed.current_password,
            new_password=parsed.new_password,
        )
        if error == "not_found" or not agent:
            return jsonify({"detail": "Not authenticated"}), 401
        if error == "invalid":
            return jsonify({"detail": "Current password is incorrect"}), 400

        try:
            send_password_changed_email(
                role_label="Agent",
                to_email=agent.email,
                name=agent.name,
                member_id=agent.id,
                when_label=_now_label(),
                ip_address=_client_ip(),
            )
        except Exception:
            logger.exception("Failed to dispatch agent password change email")

        return jsonify({"message": "Password changed successfully"})


@auth_bp.post("/organization/login")
@rate_limit(key="auth.login.organization", **_LOGIN_LIMIT)
def organization_login():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    try:
        payload = LoginRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        org, auth_error = authenticate_organization(db, payload.email, payload.password)
        if auth_error == "blocked":
            return jsonify({"detail": "Organization account is blocked"}), 403
        if not org:
            return jsonify({"detail": "Invalid email or password"}), 401

        return _login_response(
            user_key="organization",
            user_payload=serialize_organization_session(org),
            user_id=org.id,
            role=ROLE_ORGANIZATION,
        )


@auth_bp.get("/organization/me")
def organization_me():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    organization_id = decode_access_token(_access_token() or "", expected_role=ROLE_ORGANIZATION)
    if not organization_id:
        return jsonify({"detail": "Not authenticated"}), 401

    with get_db() as db:
        org = get_active_organization_by_id(db, organization_id)
        if not org:
            return jsonify({"detail": "Not authenticated"}), 401

        return jsonify(serialize_organization_session(org))


@auth_bp.patch("/organization/profile")
def organization_update_profile():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    organization_id = decode_access_token(_access_token() or "", expected_role=ROLE_ORGANIZATION)
    if not organization_id:
        return jsonify({"detail": "Not authenticated"}), 401

    try:
        payload = UpdateProfileRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"detail": exc.errors()}), 422

    with get_db() as db:
        org = update_organization_profile(db, organization_id, name=payload.name)
        if not org:
            return jsonify({"detail": "Not authenticated"}), 401

        return jsonify(
            {
                "organization": serialize_organization_session(org),
                "message": "Profile updated successfully",
            }
        )


@auth_bp.post("/organization/logout")
def organization_logout():
    return jsonify({"message": "Logged out"})


@auth_bp.post("/organization/change-password")
@rate_limit(key="auth.password.organization", **_PASSWORD_CHANGE_LIMIT)
def organization_change_password():
    ready, _ = ensure_db_ready()
    if not ready:
        return _db_unavailable_response()

    organization_id = decode_access_token(_access_token() or "", expected_role=ROLE_ORGANIZATION)
    if not organization_id:
        return jsonify({"detail": "Not authenticated"}), 401

    parsed = _parse_change_password()
    if not isinstance(parsed, ChangePasswordRequest):
        return parsed

    with get_db() as db:
        org, error = change_organization_password(
            db,
            organization_id,
            current_password=parsed.current_password,
            new_password=parsed.new_password,
        )
        if error == "not_found" or not org:
            return jsonify({"detail": "Not authenticated"}), 401
        if error == "invalid":
            return jsonify({"detail": "Current password is incorrect"}), 400

        try:
            send_password_changed_email(
                role_label="Organization",
                to_email=org.email,
                name=org.name,
                when_label=_now_label(),
                ip_address=_client_ip(),
            )
        except Exception:
            logger.exception("Failed to dispatch organization password change email")

        return jsonify({"message": "Password changed successfully"})
