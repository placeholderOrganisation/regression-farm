"""Worker-facing endpoints: register and next-job claim."""
from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Job, JobStatus, Worker, WorkerStatus
from ..services.auth import require_worker_token
from ..services.dispatcher import claim_next_job

bp = Blueprint("workers", __name__, url_prefix="/api/workers")


@bp.post("/register")
@require_worker_token
def register_worker():
    payload = request.get_json(force=True, silent=True) or {}
    name = (payload.get("name") or "").strip()
    hostname = (payload.get("hostname") or "").strip()
    if not name or not hostname:
        return jsonify({"error": "name and hostname required"}), 400

    capabilities = payload.get("capabilities") or {}
    public_ip = payload.get("public_ip")

    worker = (
        db.session.query(Worker)
        .filter_by(name=name, hostname=hostname)
        .first()
    )
    if worker is None:
        worker = Worker(
            name=name,
            hostname=hostname,
            public_ip=public_ip,
            capabilities=capabilities,
            status=WorkerStatus.IDLE.value,
        )
        db.session.add(worker)
    else:
        worker.public_ip = public_ip or worker.public_ip
        worker.capabilities = capabilities or worker.capabilities
        worker.last_seen = datetime.utcnow()
    db.session.commit()
    return jsonify(worker.to_dict()), 200


@bp.get("/<int:worker_id>/orphans")
@require_worker_token
def orphan_jobs(worker_id: int):
    """Jobs the controller still believes ``worker_id`` is running.

    Worker calls this on boot and marks them FAILED/WORKER_RESTART so
    we don't carry stale RUNNING rows after a worker crash.
    """
    rows = (
        db.session.query(Job)
        .filter(Job.worker_id == worker_id, Job.status == JobStatus.RUNNING.value)
        .all()
    )
    return jsonify([j.to_dict() for j in rows])


@bp.get("/<int:worker_id>/next-job")
@require_worker_token
def next_job(worker_id: int):
    worker = db.session.get(Worker, worker_id)
    if worker is None:
        return jsonify({"error": "unknown worker"}), 404

    worker.last_seen = datetime.utcnow()
    if worker.current_job_id:
        current = db.session.get(Job, worker.current_job_id)
        if current and current.status == JobStatus.CANCELLED.value:
            db.session.commit()
            return jsonify({"cancel_current": True, "job": None})
    db.session.commit()

    job = claim_next_job(worker_id)
    if job is None:
        return jsonify({"job": None})
    return jsonify({"job": job.to_dict()})


@bp.get("")
def list_workers():
    rows = db.session.query(Worker).order_by(Worker.id.asc()).all()
    return jsonify([w.to_dict() for w in rows])
