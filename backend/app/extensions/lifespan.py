from sqlalchemy import text
from sqlalchemy.exc import OperationalError
import threading

import app.models  # noqa: F401 — registers admin, manager, agent tables
from app.core.config import settings
from app.core.database import Base, engine


def _migrate_admin_is_active() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'admin'
                          AND column_name = 'is_active'
                          AND data_type = 'boolean'
                    ) THEN
                        ALTER TABLE admin ALTER COLUMN is_active DROP DEFAULT;
                        ALTER TABLE admin
                            ALTER COLUMN is_active TYPE SMALLINT
                            USING (CASE WHEN is_active THEN 1 ELSE 0 END);
                    END IF;
                END $$;
                """
            )
        )
        conn.execute(text("ALTER TABLE admin ALTER COLUMN is_active SET DEFAULT 1"))


def _migrate_admin_profile_columns() -> None:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE admin ADD COLUMN IF NOT EXISTS phone VARCHAR(20)"))
        conn.execute(text("ALTER TABLE admin ADD COLUMN IF NOT EXISTS job_title VARCHAR(120)"))


def _migrate_agent_manager_required() -> None:
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM agent WHERE manager_id IS NULL"))
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'agent'
                          AND column_name = 'manager_id'
                          AND is_nullable = 'YES'
                    ) THEN
                        ALTER TABLE agent ALTER COLUMN manager_id SET NOT NULL;
                    END IF;
                END $$;
                """
            )
        )


def _migrate_updated_at_columns() -> None:
    for table in ("admin", "manager", "agent"):
        with engine.begin() as conn:
            conn.execute(
                text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ")
            )
            conn.execute(
                text(
                    f"""
                    UPDATE {table}
                    SET updated_at = created_at
                    WHERE updated_at IS NULL
                    """
                )
            )
            conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN updated_at SET DEFAULT NOW()"))
            conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN updated_at SET NOT NULL"))


def _drop_outbound_schema() -> None:
    """Remove legacy outbound/calling tables and agent call columns."""
    drop_tables = (
        "agent_call_flow_response",
        "agent_call_flow_run",
        "agent_active_call",
        "agent_call_flow_step",
        "agent_call_flow",
        "agent_call_log",
        "ai_voice_call_session",
        "outbound_lead_import_batch",
        "outbound_lead",
    )
    drop_columns = (
        "ALTER TABLE agent DROP COLUMN IF EXISTS agent_type",
        "ALTER TABLE agent DROP COLUMN IF EXISTS call_mode",
        "ALTER TABLE agent DROP COLUMN IF EXISTS daily_call_target",
    )
    with engine.begin() as conn:
        for table in drop_tables:
            conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
        for stmt in drop_columns:
            conn.execute(text(stmt))


def _migrate_attendance_tables() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS attendance_session (
                    id SERIAL PRIMARY KEY,
                    user_type VARCHAR(20) NOT NULL,
                    user_id INTEGER NOT NULL,
                    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    logout_at TIMESTAMPTZ,
                    last_seen_at TIMESTAMPTZ,
                    status VARCHAR(20) NOT NULL DEFAULT 'online',
                    idle_since TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS attendance_event (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER REFERENCES attendance_session (id) ON DELETE SET NULL,
                    user_type VARCHAR(20) NOT NULL,
                    user_id INTEGER NOT NULL,
                    event_type VARCHAR(20) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_attendance_session_user "
                "ON attendance_session (user_type, user_id)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_attendance_session_login_at "
                "ON attendance_session (login_at)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_attendance_event_user_created "
                "ON attendance_event (user_type, user_id, created_at)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_attendance_event_session_id "
                "ON attendance_event (session_id)"
            )
        )


def _migrate_leave_tables() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS leave_request (
                    id SERIAL PRIMARY KEY,
                    requester_type VARCHAR(20) NOT NULL,
                    requester_id INTEGER NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    leave_type VARCHAR(20) NOT NULL DEFAULT 'casual',
                    reason TEXT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    calendar_days SMALLINT NOT NULL DEFAULT 0,
                    working_days SMALLINT NOT NULL DEFAULT 0,
                    weekend_days SMALLINT NOT NULL DEFAULT 0,
                    reviewed_by_type VARCHAR(20),
                    reviewed_by_id INTEGER,
                    review_note TEXT,
                    reviewed_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_leave_request_requester "
                "ON leave_request (requester_type, requester_id)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_leave_request_dates "
                "ON leave_request (start_date, end_date)"
            )
        )
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_leave_request_status ON leave_request (status)")
        )
        conn.execute(
            text(
                "ALTER TABLE leave_request "
                "ADD COLUMN IF NOT EXISTS assigned_reviewer_type VARCHAR(20)"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE leave_request ADD COLUMN IF NOT EXISTS assigned_reviewer_id INTEGER"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_leave_request_assigned_reviewer "
                "ON leave_request (assigned_reviewer_type, assigned_reviewer_id)"
            )
        )
        conn.execute(
            text(
                """
                UPDATE leave_request lr
                SET assigned_reviewer_type = 'manager',
                    assigned_reviewer_id = a.manager_id
                FROM agent a
                WHERE lr.requester_type = 'agent'
                  AND lr.requester_id = a.id
                  AND lr.assigned_reviewer_id IS NULL
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE leave_request lr
                SET assigned_reviewer_type = 'admin',
                    assigned_reviewer_id = m.created_by_admin_id
                FROM manager m
                WHERE lr.requester_type = 'manager'
                  AND lr.requester_id = m.id
                  AND lr.assigned_reviewer_id IS NULL
                """
            )
        )
        conn.execute(
            text(
                "ALTER TABLE leave_request "
                "ADD COLUMN IF NOT EXISTS duration_type VARCHAR(20) NOT NULL DEFAULT 'full_day'"
            )
        )
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'leave_request'
                          AND column_name = 'working_days'
                          AND data_type = 'smallint'
                    ) THEN
                        ALTER TABLE leave_request
                            ALTER COLUMN working_days TYPE NUMERIC(4,1)
                            USING working_days::numeric(4,1);
                    END IF;
                END $$;
                """
            )
        )


def _migrate_organization_tables() -> None:
    from app.core.security import hash_password

    legacy_password_hash = hash_password("__ORG_LEGACY_PLACEHOLDER__1Aa!")

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS organization (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    admin_id INTEGER NOT NULL REFERENCES admin (id) ON DELETE CASCADE,
                    is_active SMALLINT NOT NULL DEFAULT 1,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text("ALTER TABLE organization ADD COLUMN IF NOT EXISTS email VARCHAR(254)")
        )
        conn.execute(
            text("ALTER TABLE organization ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)")
        )
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_organization_admin_id ON organization (admin_id)")
        )
        conn.execute(
            text(
                """
                UPDATE organization
                SET email = 'org-' || id || '@legacy.local'
                WHERE email IS NULL OR TRIM(email) = ''
                """
            )
        )
        conn.execute(
            text(
                "UPDATE organization SET password_hash = :hash "
                "WHERE password_hash IS NULL OR TRIM(password_hash) = ''"
            ),
            {"hash": legacy_password_hash},
        )
        conn.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS ix_organization_email ON organization (email)")
        )
        conn.execute(
            text("ALTER TABLE organization ALTER COLUMN email SET NOT NULL")
        )
        conn.execute(
            text("ALTER TABLE organization ALTER COLUMN password_hash SET NOT NULL")
        )
        conn.execute(text("DROP INDEX IF EXISTS ix_organization_twilio_phone_number"))
        for drop_sql in (
            "ALTER TABLE organization DROP COLUMN IF EXISTS twilio_phone_number",
            "ALTER TABLE organization DROP COLUMN IF EXISTS twilio_account_sid",
            "ALTER TABLE organization DROP COLUMN IF EXISTS twilio_auth_token",
            "ALTER TABLE organization DROP COLUMN IF EXISTS twilio_webhook_url",
            "ALTER TABLE organization DROP COLUMN IF EXISTS twilio_call_webhook_url",
            "ALTER TABLE organization DROP COLUMN IF EXISTS twilio_sms_webhook_url",
            "ALTER TABLE organization DROP COLUMN IF EXISTS twilio_webhook_base_url",
            "ALTER TABLE organization DROP COLUMN IF EXISTS twilio_api_key_sid",
            "ALTER TABLE organization DROP COLUMN IF EXISTS twilio_api_key_secret",
            "ALTER TABLE organization DROP COLUMN IF EXISTS twilio_twiml_app_sid",
            "ALTER TABLE organization DROP COLUMN IF EXISTS phone_country_code",
            "ALTER TABLE organization DROP COLUMN IF EXISTS openai_api_key",
            "ALTER TABLE organization DROP COLUMN IF EXISTS app_name",
            "ALTER TABLE organization DROP COLUMN IF EXISTS app_url",
            "ALTER TABLE organization DROP COLUMN IF EXISTS email_host",
            "ALTER TABLE organization DROP COLUMN IF EXISTS email_port",
            "ALTER TABLE organization DROP COLUMN IF EXISTS email_user",
            "ALTER TABLE organization DROP COLUMN IF EXISTS email_pass",
            "ALTER TABLE organization DROP COLUMN IF EXISTS email_from",
            "ALTER TABLE organization DROP COLUMN IF EXISTS email_reply_to",
            "ALTER TABLE organization DROP COLUMN IF EXISTS email_use_tls",
            "ALTER TABLE organization DROP COLUMN IF EXISTS s3_access_key",
            "ALTER TABLE organization DROP COLUMN IF EXISTS s3_secret_key",
            "ALTER TABLE organization DROP COLUMN IF EXISTS s3_bucket_name",
            "ALTER TABLE organization DROP COLUMN IF EXISTS s3_region",
            "ALTER TABLE organization DROP COLUMN IF EXISTS s3_recordings_prefix",
        ):
            conn.execute(text(drop_sql))
        conn.execute(
            text(
                "ALTER TABLE manager ADD COLUMN IF NOT EXISTS organization_id INTEGER "
                "REFERENCES organization (id) ON DELETE RESTRICT"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_manager_organization_id ON manager (organization_id)"
            )
        )
        conn.execute(
            text(
                """
                UPDATE manager m
                SET organization_id = o.id
                FROM organization o
                WHERE m.organization_id IS NULL
                  AND o.admin_id = m.created_by_admin_id
                """
            )
        )


def _migrate_performance_indexes() -> None:
    """Composite and partial indexes for list, dashboard, attendance, and leave queries."""
    statements = (
        "CREATE INDEX IF NOT EXISTS ix_organization_admin_active ON organization (admin_id, is_active)",
        "CREATE INDEX IF NOT EXISTS ix_manager_org_active ON manager (organization_id, is_active)",
        "CREATE INDEX IF NOT EXISTS ix_agent_manager_active ON agent (manager_id, is_active)",
        "CREATE INDEX IF NOT EXISTS ix_leave_request_requester_status "
        "ON leave_request (requester_type, requester_id, status)",
        "CREATE INDEX IF NOT EXISTS ix_leave_request_reviewer_status "
        "ON leave_request (assigned_reviewer_type, assigned_reviewer_id, status)",
        "CREATE INDEX IF NOT EXISTS ix_leave_request_status_start "
        "ON leave_request (status, start_date)",
        "CREATE INDEX IF NOT EXISTS ix_attendance_session_user_login "
        "ON attendance_session (user_type, user_id, login_at DESC)",
        "CREATE INDEX IF NOT EXISTS ix_attendance_session_open "
        "ON attendance_session (last_seen_at) WHERE logout_at IS NULL",
    )
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


_migrations_ready = False
_schema_initialized = False
_migration_lock = threading.RLock()


def ensure_app_schema() -> None:
    """Run idempotent DB setup once per process (safe under werkzeug reloader)."""
    global _schema_initialized
    if _schema_initialized:
        return
    with _migration_lock:
        if _schema_initialized:
            return
        init_app_data()
        _schema_initialized = True


def run_pending_migrations() -> None:
    """Run idempotent schema migrations once per process."""
    global _migrations_ready
    if _migrations_ready:
        return
    with _migration_lock:
        if _migrations_ready:
            return
        print("Running database migrations...")
        _drop_outbound_schema()
        _migrate_attendance_tables()
        _migrate_leave_tables()
        _migrate_organization_tables()
        _migrate_performance_indexes()
        _migrations_ready = True
        print("Database migrations complete.")


def init_app_data() -> bool:
    try:
        Base.metadata.create_all(bind=engine)
        _migrate_admin_is_active()
        _migrate_admin_profile_columns()
        _migrate_agent_manager_required()
        _migrate_updated_at_columns()
        run_pending_migrations()
        print("Database tables ready.")
        return True
    except OperationalError as exc:
        print("\nPostgreSQL connection failed.")
        print(f"  Host: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}")
        print(f"  Database: {settings.POSTGRES_DB}")
        print(f"  User: {settings.POSTGRES_USER}")
        print("\nServer chalega, lekin login tab tak kaam nahi karega jab tak DB connect na ho.")
        print("backend/.env me AWS RDS credentials check karo aur file save karo.")
        print("RDS ke liye POSTGRES_SSLMODE=require rakho.")
        print("AWS Security Group me apne IP se port 5432 allow karo.\n")
        raise exc


_db_ready_state: dict[str, float | bool | str | None] = {
    "checked_at": 0.0,
    "ok": False,
    "error": None,
}
_db_ready_lock = threading.Lock()
_DB_READY_HEALTHY_TTL = 30.0
_DB_READY_FAILURE_TTL = 2.0


def ensure_db_ready() -> tuple[bool, str | None]:
    """Cheap readiness probe with a short in-process cache."""
    import time

    now = time.monotonic()
    last = float(_db_ready_state["checked_at"] or 0.0)
    ttl = _DB_READY_HEALTHY_TTL if _db_ready_state["ok"] else _DB_READY_FAILURE_TTL
    if now - last < ttl:
        return bool(_db_ready_state["ok"]), _db_ready_state["error"]  # type: ignore[return-value]

    with _db_ready_lock:
        last = float(_db_ready_state["checked_at"] or 0.0)
        ttl = _DB_READY_HEALTHY_TTL if _db_ready_state["ok"] else _DB_READY_FAILURE_TTL
        if time.monotonic() - last < ttl:
            return bool(_db_ready_state["ok"]), _db_ready_state["error"]  # type: ignore[return-value]
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            _db_ready_state.update(checked_at=time.monotonic(), ok=True, error=None)
            return True, None
        except OperationalError as exc:
            err = str(exc).split("\n")[0]
            _db_ready_state.update(checked_at=time.monotonic(), ok=False, error=err)
            return False, err
        except Exception as exc:  # noqa: BLE001
            err = str(exc).split("\n")[0]
            _db_ready_state.update(checked_at=time.monotonic(), ok=False, error=err)
            return False, err


_attendance_cleanup_started = False
_attendance_cleanup_lock = threading.Lock()


def start_attendance_cleanup_worker() -> None:
    global _attendance_cleanup_started
    with _attendance_cleanup_lock:
        if _attendance_cleanup_started:
            return
        _attendance_cleanup_started = True

    def _loop() -> None:
        import time

        from app.api.deps import get_db
        from app.services.attendance import close_stale_sessions

        while True:
            time.sleep(60)
            try:
                ready, _ = ensure_db_ready()
                if not ready:
                    continue
                with get_db() as db:
                    close_stale_sessions(db)
            except Exception:
                pass

    thread = threading.Thread(target=_loop, daemon=True, name="attendance-cleanup")
    thread.start()
