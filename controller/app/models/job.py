from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Index
from sqlalchemy.dialects.postgresql import JSONB

from ..extensions import db


class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"
    CANCELLED = "CANCELLED"


TERMINAL_STATUSES = {
    JobStatus.PASSED.value,
    JobStatus.FAILED.value,
    JobStatus.TIMED_OUT.value,
    JobStatus.CANCELLED.value,
}


class Job(db.Model):
    __tablename__ = "jobs"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    image = db.Column(db.String(512), nullable=False)
    command = db.Column(JSONB, nullable=True)  # list[str] or None
    env = db.Column(JSONB, nullable=False, default=dict)

    status = db.Column(db.String(16), nullable=False, default=JobStatus.QUEUED.value)
    priority = db.Column(db.Integer, nullable=False, default=0)
    timeout_seconds = db.Column(db.Integer, nullable=False, default=1800)

    worker_id = db.Column(db.Integer, db.ForeignKey("workers.id", ondelete="SET NULL"), nullable=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True)

    exit_code = db.Column(db.Integer, nullable=True)
    failure_reason = db.Column(db.String(64), nullable=True)

    queued_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    started_at = db.Column(db.DateTime, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)

    test_run = db.relationship("TestRun", uselist=False, back_populates="job", cascade="all, delete-orphan")
    logs = db.relationship("LogFile", back_populates="job", cascade="all, delete-orphan")
    artifacts = db.relationship("Artifact", back_populates="job", cascade="all, delete-orphan")
    worker = db.relationship("Worker", foreign_keys=[worker_id])

    __table_args__ = (
        Index("ix_jobs_dispatch", "status", "priority", "queued_at"),
        Index("ix_jobs_worker", "worker_id"),
        Index("ix_jobs_schedule", "schedule_id"),
        Index("ix_jobs_status", "status"),
    )

    def to_dict(self, include_relations: bool = False) -> dict:
        out = {
            "id": self.id,
            "name": self.name,
            "image": self.image,
            "command": self.command,
            "env": self.env or {},
            "status": self.status,
            "priority": self.priority,
            "timeout_seconds": self.timeout_seconds,
            "worker_id": self.worker_id,
            "schedule_id": self.schedule_id,
            "exit_code": self.exit_code,
            "failure_reason": self.failure_reason,
            "queued_at": self.queued_at.isoformat() if self.queued_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
        }
        if include_relations:
            out["test_run"] = self.test_run.to_dict() if self.test_run else None
            out["artifacts"] = [a.to_dict() for a in self.artifacts]
            out["worker"] = {"id": self.worker.id, "name": self.worker.name} if self.worker else None
        return out
