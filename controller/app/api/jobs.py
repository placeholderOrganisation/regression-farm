"""Job lifecycle endpoints: enqueue, status updates, artifacts, cancel/rerun."""
from __future__ import annotations

import os
import uuid
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from ..extensions import db
from ..models import Artifact, Job, JobStatus, TestRun, Worker, WorkerStatus
from ..models.job import TERMINAL_STATUSES
from ..services.auth import require_worker_token
from ..services.dispatcher import release_worker
from ..services.log_parser import parse_job

bp = Blueprint("jobs", __name__, url_prefix="/api/jobs")


@bp.post("")
def enqueue_job():
    payload = request.get_json(force=True, silent=True) or {}
    name = payload.get("name") or "ad-hoc"
    image = payload.get("image")
    if not image:
        return jsonify({"error": "image required"}), 400
    job = Job(
        name=name,
        image=image,
        command=payload.get("command"),
        env=payload.get("env") or {},
        priority=int(payload.get("priority") or 0),
        timeout_seconds=int(payload.get("timeout_seconds") or current_app.config["DEFAULT_JOB_TIMEOUT"]),
    )
    db.session.add(job)
    db.session.commit()
    return jsonify(job.to_dict()), 201


@bp.get("")
def list_jobs():
    q = db.session.query(Job)
    status = request.args.get("status")
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        q = q.filter(Job.status.in_(statuses))
    worker_id = request.args.get("worker_id")
    if worker_id:
        q = q.filter(Job.worker_id == int(worker_id))
    schedule_id = request.args.get("schedule_id")
    if schedule_id:
        q = q.filter(Job.schedule_id == int(schedule_id))
    image = request.args.get("image")
    if image:
        q = q.filter(Job.image.ilike(f"%{image}%"))
    limit = min(int(request.args.get("limit") or 100), 500)
    offset = int(request.args.get("offset") or 0)
    total = q.count()
    rows = q.order_by(Job.id.desc()).offset(offset).limit(limit).all()
    return jsonify({"total": total, "items": [j.to_dict() for j in rows]})


@bp.get("/<int:job_id>")
def get_job(job_id: int):
    job = db.session.get(Job, job_id)
    if job is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(job.to_dict(include_relations=True))


@bp.post("/<int:job_id>/status")
@require_worker_token
def update_status(job_id: int):
    payload = request.get_json(force=True, silent=True) or {}
    status = payload.get("status")
    if status not in {s.value for s in JobStatus}:
        return jsonify({"error": f"invalid status: {status}"}), 400

    job = db.session.get(Job, job_id)
    if job is None:
        return jsonify({"error": "not found"}), 404

    job.status = status
    if "exit_code" in payload:
        job.exit_code = payload.get("exit_code")
    if "reason" in payload:
        job.failure_reason = (payload.get("reason") or "")[:500]

    if status == JobStatus.RUNNING.value and job.started_at is None:
        job.started_at = datetime.utcnow()

    if status in TERMINAL_STATUSES:
        job.finished_at = datetime.utcnow()
        if job.worker_id:
            worker = db.session.get(Worker, job.worker_id)
            if worker is not None:
                worker.current_job_id = None
                worker.status = WorkerStatus.IDLE.value
                worker.last_seen = datetime.utcnow()

    db.session.commit()

    if status in TERMINAL_STATUSES:
        try:
            parse_job(job.id)
        except Exception:
            current_app.logger.exception("log parser failed for job %s", job.id)

    return jsonify(job.to_dict())


@bp.post("/<int:job_id>/artifacts")
@require_worker_token
def upload_artifact(job_id: int):
    job = db.session.get(Job, job_id)
    if job is None:
        return jsonify({"error": "not found"}), 404
    file = request.files.get("file")
    if file is None or not file.filename:
        return jsonify({"error": "missing file"}), 400

    name = secure_filename(file.filename)
    job_dir = os.path.join(current_app.config["ARTIFACT_DIR"], f"job-{job_id}")
    os.makedirs(job_dir, exist_ok=True)
    path = os.path.join(job_dir, f"{uuid.uuid4().hex}-{name}")
    file.save(path)
    size = os.path.getsize(path)

    art = Artifact(
        job_id=job.id,
        name=name,
        path=path,
        content_type=file.mimetype,
        size_bytes=size,
    )
    db.session.add(art)
    db.session.commit()
    return jsonify(art.to_dict()), 201


@bp.post("/<int:job_id>/cancel")
def cancel_job(job_id: int):
    job = db.session.get(Job, job_id)
    if job is None:
        return jsonify({"error": "not found"}), 404
    if job.status in TERMINAL_STATUSES:
        return jsonify({"error": f"cannot cancel job in terminal state {job.status}"}), 409
    job.status = JobStatus.CANCELLED.value
    if job.started_at and job.finished_at is None:
        job.finished_at = datetime.utcnow()
    db.session.commit()
    return jsonify(job.to_dict())


@bp.post("/<int:job_id>/rerun")
def rerun_job(job_id: int):
    job = db.session.get(Job, job_id)
    if job is None:
        return jsonify({"error": "not found"}), 404
    new_job = Job(
        name=f"{job.name} (rerun)",
        image=job.image,
        command=job.command,
        env=job.env or {},
        priority=job.priority,
        timeout_seconds=job.timeout_seconds,
    )
    db.session.add(new_job)
    db.session.commit()
    return jsonify(new_job.to_dict()), 201
