"""APScheduler-based recurring schedule executor + retention cleanup.

Runs in-process inside the single gunicorn worker. Cron schedules are stored
in the DB; this loop polls them, enqueues new jobs when due, and advances
``next_run_at``. A daily cleanup task purges old logs/artifacts.
"""
from __future__ import annotations

import logging
import os
import shutil
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from croniter import croniter
from flask import Flask

from ..extensions import db
from ..models import Artifact, Job, JobStatus, LogFile, Schedule

logger = logging.getLogger(__name__)


def _tick_schedules(app: Flask) -> None:
    with app.app_context():
        now = datetime.utcnow()
        rows = db.session.query(Schedule).filter(Schedule.enabled.is_(True)).all()
        for s in rows:
            if s.next_run_at is None:
                try:
                    s.next_run_at = croniter(s.cron_expr, now).get_next(datetime)
                except Exception as exc:
                    logger.error("invalid cron expression for schedule %s: %s", s.id, exc)
                    continue
                db.session.commit()
                continue
            if s.next_run_at > now:
                continue
            job = Job(
                name=f"{s.name} #{int(now.timestamp())}",
                image=s.image,
                command=s.command,
                env=s.env or {},
                priority=s.priority,
                timeout_seconds=s.timeout_seconds,
                schedule_id=s.id,
            )
            db.session.add(job)
            s.last_triggered_at = now
            try:
                s.next_run_at = croniter(s.cron_expr, now).get_next(datetime)
            except Exception:
                s.next_run_at = None
            db.session.commit()
            logger.info("scheduler enqueued job %s from schedule %s", job.id, s.id)


def _retention_cleanup(app: Flask) -> None:
    with app.app_context():
        days = app.config.get("LOG_RETENTION_DAYS", 30)
        cutoff = datetime.utcnow() - timedelta(days=days)

        old_jobs = (
            db.session.query(Job)
            .filter(Job.finished_at.isnot(None), Job.finished_at < cutoff)
            .all()
        )
        removed = 0
        for j in old_jobs:
            for log in list(j.logs):
                try:
                    if log.path and os.path.exists(log.path):
                        os.remove(log.path)
                except OSError:
                    logger.exception("failed to remove log %s", log.path)
            for art in list(j.artifacts):
                try:
                    if art.path and os.path.exists(art.path):
                        if os.path.isdir(art.path):
                            shutil.rmtree(art.path, ignore_errors=True)
                        else:
                            os.remove(art.path)
                except OSError:
                    logger.exception("failed to remove artifact %s", art.path)
            db.session.delete(j)
            removed += 1
        if removed:
            db.session.commit()
            logger.info("retention cleanup removed %d old jobs", removed)


def start_scheduler(app: Flask) -> BackgroundScheduler | None:
    if not app.config.get("SCHEDULER_ENABLED", True):
        return None
    if os.environ.get("WERKZEUG_RUN_MAIN") == "false":
        return None  # avoid double-start under flask debug reloader

    scheduler = BackgroundScheduler(
        timezone="UTC",
        job_defaults={
            "coalesce": True,
            "max_instances": 1,
            "misfire_grace_time": app.config.get("SCHEDULER_MISFIRE_GRACE", 300),
        },
    )
    tick_seconds = app.config.get("SCHEDULER_TICK_SECONDS", 15)
    scheduler.add_job(_tick_schedules, "interval", seconds=tick_seconds, args=[app], id="tick_schedules")
    scheduler.add_job(_retention_cleanup, "cron", hour=3, minute=0, args=[app], id="retention_cleanup")
    scheduler.start()
    logger.info("APScheduler started (tick=%ss, retention_days=%s)", tick_seconds, app.config.get("LOG_RETENTION_DAYS"))
    return scheduler
