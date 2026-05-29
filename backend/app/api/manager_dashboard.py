from flask import Blueprint, jsonify

from app.api.common import auth_error_response, db_unavailable_response
from app.api.deps import get_current_manager, get_db
from app.extensions.lifespan import ensure_db_ready
from app.services.dashboard_stats import get_manager_dashboard_stats_cached

manager_dashboard_bp = Blueprint("manager_dashboard", __name__, url_prefix="/api/manager")


@manager_dashboard_bp.get("/dashboard/stats")
def manager_dashboard_stats():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    manager = get_current_manager()
    if not manager:
        return auth_error_response()

    with get_db() as db:
        payload = get_manager_dashboard_stats_cached(db, manager.id)
        response = jsonify(payload)
        response.headers["Cache-Control"] = "private, max-age=15"
        return response
