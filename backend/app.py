import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("FLASK_DEBUG", "1").strip().lower() in {"1", "true", "yes"}
    threaded = os.getenv("FLASK_THREADED", "1").strip().lower() in {"1", "true", "yes"}
    print(f"Starting server at http://127.0.0.1:{port} (threaded={threaded})")
    app.run(host="127.0.0.1", port=port, debug=debug, threaded=threaded)
