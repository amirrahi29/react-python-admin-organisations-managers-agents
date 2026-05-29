from flask import Blueprint, jsonify

from app.api.common import auth_error_response, db_unavailable_response
from app.api.deps import get_current_admin, get_db
from app.extensions.lifespan import ensure_db_ready
from app.services.dashboard_stats import get_admin_dashboard_stats_cached

admin_dashboard_bp = Blueprint("admin_dashboard", __name__, url_prefix="/api/admin")


@admin_dashboard_bp.get("/dashboard/stats")
def admin_dashboard_stats():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    admin = get_current_admin()
    if not admin:
        return auth_error_response()

    with get_db() as db:
        payload = get_admin_dashboard_stats_cached(db, admin.id)
        response = jsonify(payload)
        response.headers["Cache-Control"] = "private, max-age=15"
        return response
