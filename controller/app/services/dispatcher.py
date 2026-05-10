"""Concurrency-safe job dispatcher using SELECT ... FOR UPDATE SKIP LOCKED.

Multiple workers can poll simultaneously without ever being assigned the same
job. The whole claim happens in a single transaction.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import text

from ..extensions import db
from ..models import Job, JobStatus, Worker, WorkerStatus


def claim_next_job(worker_id: int) -> Optional[Job]:
    """Atomically pick the highest-priority queued job and assign to worker.

    Returns the claimed Job (now status=RUNNING, worker_id=worker_id) or None.
    """
    sql = text(
        """
        SELECT id FROM jobs
        WHERE status = 'QUEUED'
        ORDER BY priority DESC, queued_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        """
    )
    row = db.session.execute(sql).first()
    if row is None:
        return None

    job_id = row[0]
    job = db.session.get(Job, job_id)
    if job is None or job.status != JobStatus.QUEUED.value:
        return None

    job.status = JobStatus.RUNNING.value
    job.worker_id = worker_id
    job.started_at = datetime.utcnow()

    worker = db.session.get(Worker, worker_id)
    if worker is not None:
        worker.status = WorkerStatus.BUSY.value
        worker.current_job_id = job.id
        worker.last_seen = datetime.utcnow()

    db.session.commit()
    return job


def release_worker(worker_id: int, becoming_idle: bool = True) -> None:
    worker = db.session.get(Worker, worker_id)
    if worker is None:
        return
    worker.current_job_id = None
    if becoming_idle:
        worker.status = WorkerStatus.IDLE.value
    worker.last_seen = datetime.utcnow()
    db.session.commit()
