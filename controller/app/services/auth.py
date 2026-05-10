"""Bearer-token auth for worker-write endpoints."""
from __future__ import annotations

from functools import wraps

from flask import current_app, jsonify, request


def require_worker_token(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = current_app.config.get("WORKER_TOKEN", "")
        if not token:
            return jsonify({"error": "controller misconfigured: WORKER_TOKEN unset"}), 500
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "missing bearer token"}), 401
        provided = header[len("Bearer ") :].strip()
        if provided != token:
            return jsonify({"error": "invalid worker token"}), 403
        return fn(*args, **kwargs)

    return wrapper
