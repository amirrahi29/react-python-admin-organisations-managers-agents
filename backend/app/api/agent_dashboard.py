from flask import Blueprint, jsonify

from app.api.common import auth_error_response, db_unavailable_response
from app.api.deps import get_current_agent, get_db
from app.extensions.lifespan import ensure_db_ready
from app.services.dashboard_stats import get_agent_dashboard_stats_cached

agent_dashboard_bp = Blueprint("agent_dashboard", __name__, url_prefix="/api/agent")


@agent_dashboard_bp.get("/dashboard/stats")
def agent_dashboard_stats():
    ready, _ = ensure_db_ready()
    if not ready:
        return db_unavailable_response()

    agent = get_current_agent()
    if not agent:
        return auth_error_response()

    with get_db() as db:
        return jsonify(get_agent_dashboard_stats_cached(db, agent.id))
