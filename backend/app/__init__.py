from flask import Flask, jsonify
from flask_compress import Compress
from flask_cors import CORS
import logging
import os

from sqlalchemy.exc import SQLAlchemyError

from app.api.admin_dashboard import admin_dashboard_bp
from app.api.agent_dashboard import agent_dashboard_bp
from app.api.attendance import attendance_bp
from app.api.auth import auth_bp
from app.api.leaves import leaves_bp
from app.api.manager_dashboard import manager_dashboard_bp
from app.api.manager_team import manager_team_bp
from app.api.organization_team import organization_team_bp
from app.api.organizations import organizations_bp
from app.api.team import team_bp
from app.core.config import settings
from app.extensions.lifespan import ensure_app_schema, ensure_db_ready, start_attendance_cleanup_worker
from app.routes.health import health_bp


def create_app() -> Flask:
    app = Flask(__name__)

    app.config.setdefault(
        "COMPRESS_MIMETYPES",
        [
            "application/json",
            "text/html",
            "text/css",
            "text/xml",
            "application/javascript",
            "text/javascript",
            "text/plain",
        ],
    )
    app.config.setdefault("COMPRESS_LEVEL", 6)
    app.config.setdefault("COMPRESS_MIN_SIZE", 500)
    app.config.setdefault("COMPRESS_BR_LEVEL", 4)
    Compress(app)

    CORS(
        app,
        origins=settings.cors_origins,
        supports_credentials=True,
        allow_headers=["Content-Type"],
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    )

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(leaves_bp)
    app.register_blueprint(team_bp)
    app.register_blueprint(organizations_bp)
    app.register_blueprint(organization_team_bp)
    app.register_blueprint(manager_team_bp)
    app.register_blueprint(manager_dashboard_bp)
    app.register_blueprint(admin_dashboard_bp)
    app.register_blueprint(agent_dashboard_bp)

    @app.errorhandler(SQLAlchemyError)
    def handle_db_error(exc):
        return jsonify({"detail": "Database request failed."}), 503

    @app.get("/api/db-status")
    def db_status():
        ready, error = ensure_db_ready()
        return jsonify({"ready": ready, "error": error}), 200 if ready else 503

    email_logger = logging.getLogger(__name__)
    for warning in settings.email_deliverability_warnings():
        email_logger.warning("Email deliverability: %s", warning)

    try:
        if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
            ensure_app_schema()
    except Exception as exc:
        email_logger.warning("Database schema setup skipped: %s", exc)

    start_attendance_cleanup_worker()

    return app
