from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    return jsonify({"status": "ok"})


@health_bp.get("/")
def home():
    return jsonify(
        {
            "service": "admin-backend",
            "health": "/health",
            "auth": {
                "login": "POST /api/auth/login",
                "me": "GET /api/auth/me",
                "logout": "POST /api/auth/logout",
            },
        }
    )
