"""Aggregated views for the dashboard analytics page."""
from __future__ import annotations

from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from ..extensions import db
from ..models import Job, JobStatus, TestRun, Worker

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@bp.get("/summary")
def summary():
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    counts = (
        db.session.query(Job.status, func.count(Job.id))
        .filter(Job.queued_at >= today_start)
        .group_by(Job.status)
        .all()
    )
    by_status = {s.value: 0 for s in JobStatus}
    for status, n in counts:
        by_status[status] = n

    queued = db.session.query(func.count(Job.id)).filter(Job.status == JobStatus.QUEUED.value).scalar() or 0
    running = db.session.query(func.count(Job.id)).filter(Job.status == JobStatus.RUNNING.value).scalar() or 0
    workers_total = db.session.query(func.count(Worker.id)).scalar() or 0
    workers_busy = db.session.query(func.count(Worker.id)).filter(Worker.status == "BUSY").scalar() or 0

    return jsonify({
        "today": by_status,
        "queued_now": queued,
        "running_now": running,
        "workers_total": workers_total,
        "workers_busy": workers_busy,
    })


@bp.get("/trends")
def trends():
    days = int(request.args.get("days", "14"))
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.session.query(
            func.date_trunc("day", Job.finished_at).label("day"),
            Job.status,
            func.count(Job.id),
        )
        .filter(Job.finished_at.isnot(None), Job.finished_at >= since)
        .group_by("day", Job.status)
        .order_by("day")
        .all()
    )
    by_day: dict = {}
    for day, status, n in rows:
        key = day.date().isoformat()
        by_day.setdefault(key, {s.value: 0 for s in JobStatus})[status] = n
    series = [{"day": k, **v} for k, v in sorted(by_day.items())]
    return jsonify({"series": series})


@bp.get("/flaky")
def flaky():
    """Group jobs by image and report mixed pass/fail history (proxy for flakiness)."""
    rows = (
        db.session.query(
            Job.image,
            func.count(Job.id).label("runs"),
            func.sum(func.cast(Job.status == JobStatus.PASSED.value, db.Integer)).label("passed"),
            func.sum(func.cast(Job.status == JobStatus.FAILED.value, db.Integer)).label("failed"),
        )
        .filter(Job.status.in_([JobStatus.PASSED.value, JobStatus.FAILED.value]))
        .group_by(Job.image)
        .all()
    )
    out = []
    for image, runs, passed, failed in rows:
        passed = int(passed or 0)
        failed = int(failed or 0)
        if passed > 0 and failed > 0:
            out.append({
                "image": image,
                "runs": int(runs),
                "passed": passed,
                "failed": failed,
                "flake_rate": failed / (passed + failed),
            })
    out.sort(key=lambda x: x["flake_rate"], reverse=True)
    return jsonify({"items": out[:50]})


@bp.get("/workers")
def worker_utilization():
    days = int(request.args.get("days", "7"))
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.session.query(
            Worker.id,
            Worker.name,
            func.count(Job.id),
            func.coalesce(func.sum(func.extract("epoch", Job.finished_at - Job.started_at)), 0),
        )
        .outerjoin(Job, (Job.worker_id == Worker.id) & (Job.finished_at.isnot(None)) & (Job.finished_at >= since))
        .group_by(Worker.id, Worker.name)
        .all()
    )
    return jsonify({
        "workers": [
            {"id": wid, "name": name, "jobs": int(jobs), "busy_seconds": float(secs or 0)}
            for wid, name, jobs, secs in rows
        ],
    })


@bp.get("/durations")
def durations():
    days = int(request.args.get("days", "14"))
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.session.query(
            func.date_trunc("day", Job.finished_at).label("day"),
            func.avg(TestRun.duration_seconds),
        )
        .join(TestRun, TestRun.job_id == Job.id)
        .filter(Job.finished_at.isnot(None), Job.finished_at >= since)
        .group_by("day")
        .order_by("day")
        .all()
    )
    return jsonify({
        "series": [
            {"day": d.date().isoformat(), "avg_seconds": float(avg or 0)}
            for d, avg in rows
        ]
    })
