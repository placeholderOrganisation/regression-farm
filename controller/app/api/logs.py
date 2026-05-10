"""Append-by-offset log streaming protocol.

Workers POST new bytes with the byte ``offset`` they expect to be at; the
controller accepts only when offset matches current_size, returns the new
size on success, or 409 with the current size on mismatch so the worker
can resync.
"""
from __future__ import annotations

import os
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request

from ..extensions import db
from ..models import Job, LogFile
from ..services.auth import require_worker_token

bp = Blueprint("logs", __name__, url_prefix="/api/jobs")


def _log_path(job_id: int) -> str:
    job_dir = os.path.join(current_app.config["LOG_DIR"], f"job-{job_id}")
    os.makedirs(job_dir, exist_ok=True)
    return os.path.join(job_dir, "stdout.log")


@bp.post("/<int:job_id>/logs")
@require_worker_token
def append_log(job_id: int):
    job = db.session.get(Job, job_id)
    if job is None:
        return jsonify({"error": "not found"}), 404

    try:
        offset = int(request.args.get("offset", "0"))
    except ValueError:
        return jsonify({"error": "invalid offset"}), 400

    chunk = request.get_data(cache=False, as_text=False)
    if len(chunk) > current_app.config["MAX_LOG_CHUNK_BYTES"]:
        return jsonify({"error": "chunk too large"}), 413

    log = (
        db.session.query(LogFile)
        .filter_by(job_id=job_id)
        .one_or_none()
    )
    if log is None:
        path = _log_path(job_id)
        if not os.path.exists(path):
            open(path, "wb").close()
        log = LogFile(job_id=job_id, path=path, size_bytes=0)
        db.session.add(log)
        db.session.flush()

    current_size = os.path.getsize(log.path) if os.path.exists(log.path) else 0
    if offset != current_size:
        return jsonify({"error": "offset mismatch", "current_size": current_size}), 409

    with open(log.path, "ab") as f:
        f.write(chunk)
    new_size = current_size + len(chunk)
    log.size_bytes = new_size
    log.uploaded_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"size": new_size})


@bp.get("/<int:job_id>/logs")
def get_log(job_id: int):
    log = db.session.query(LogFile).filter_by(job_id=job_id).one_or_none()
    if log is None or not os.path.exists(log.path):
        return jsonify({"size": 0, "data": "", "since": int(request.args.get("since", "0"))})

    try:
        since = int(request.args.get("since", "0"))
    except ValueError:
        since = 0

    size = os.path.getsize(log.path)
    if since >= size:
        return jsonify({"size": size, "data": "", "since": since})

    with open(log.path, "rb") as f:
        f.seek(since)
        data = f.read()
    return jsonify({
        "size": size,
        "data": data.decode("utf-8", errors="replace"),
        "since": since,
    })
