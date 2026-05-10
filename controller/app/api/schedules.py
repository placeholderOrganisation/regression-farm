"""Cron-based schedule CRUD."""
from __future__ import annotations

from datetime import datetime

from croniter import croniter
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Schedule

bp = Blueprint("schedules", __name__, url_prefix="/api/schedules")


def _validate_cron(expr: str) -> bool:
    try:
        croniter(expr)
        return True
    except Exception:
        return False


@bp.get("")
def list_schedules():
    rows = db.session.query(Schedule).order_by(Schedule.id.asc()).all()
    return jsonify([s.to_dict() for s in rows])


@bp.post("")
def create_schedule():
    p = request.get_json(force=True, silent=True) or {}
    name = (p.get("name") or "").strip()
    cron_expr = (p.get("cron_expr") or "").strip()
    image = (p.get("image") or "").strip()
    if not name or not cron_expr or not image:
        return jsonify({"error": "name, cron_expr, image required"}), 400
    if not _validate_cron(cron_expr):
        return jsonify({"error": "invalid cron_expr"}), 400

    s = Schedule(
        name=name,
        cron_expr=cron_expr,
        image=image,
        command=p.get("command"),
        env=p.get("env") or {},
        timeout_seconds=int(p.get("timeout_seconds") or 1800),
        priority=int(p.get("priority") or 0),
        enabled=bool(p.get("enabled", True)),
    )
    s.next_run_at = croniter(cron_expr, datetime.utcnow()).get_next(datetime)
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@bp.patch("/<int:schedule_id>")
def update_schedule(schedule_id: int):
    s = db.session.get(Schedule, schedule_id)
    if s is None:
        return jsonify({"error": "not found"}), 404
    p = request.get_json(force=True, silent=True) or {}
    if "name" in p:
        s.name = p["name"]
    if "cron_expr" in p:
        if not _validate_cron(p["cron_expr"]):
            return jsonify({"error": "invalid cron_expr"}), 400
        s.cron_expr = p["cron_expr"]
        s.next_run_at = croniter(p["cron_expr"], datetime.utcnow()).get_next(datetime)
    for f in ("image", "command", "env", "timeout_seconds", "priority", "enabled"):
        if f in p:
            setattr(s, f, p[f])
    db.session.commit()
    return jsonify(s.to_dict())


@bp.delete("/<int:schedule_id>")
def delete_schedule(schedule_id: int):
    s = db.session.get(Schedule, schedule_id)
    if s is None:
        return jsonify({"error": "not found"}), 404
    db.session.delete(s)
    db.session.commit()
    return "", 204


@bp.post("/preview")
def preview_cron():
    p = request.get_json(force=True, silent=True) or {}
    expr = (p.get("cron_expr") or "").strip()
    if not _validate_cron(expr):
        return jsonify({"error": "invalid cron_expr"}), 400
    it = croniter(expr, datetime.utcnow())
    fires = [it.get_next(datetime).isoformat() for _ in range(5)]
    return jsonify({"next_fires": fires})
