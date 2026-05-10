from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Index
from sqlalchemy.dialects.postgresql import JSONB

from ..extensions import db


class WorkerStatus(str, enum.Enum):
    IDLE = "IDLE"
    BUSY = "BUSY"


class Worker(db.Model):
    __tablename__ = "workers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    hostname = db.Column(db.String(255), nullable=False)
    public_ip = db.Column(db.String(64), nullable=True)
    status = db.Column(db.String(16), nullable=False, default=WorkerStatus.IDLE.value)
    capabilities = db.Column(JSONB, nullable=False, default=dict)
    current_job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", use_alter=True, name="fk_worker_current_job"), nullable=True)
    last_seen = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    registered_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("name", "hostname", name="uq_worker_name_host"),
        Index("ix_workers_last_seen", "last_seen"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "hostname": self.hostname,
            "public_ip": self.public_ip,
            "status": self.status,
            "capabilities": self.capabilities or {},
            "current_job_id": self.current_job_id,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "registered_at": self.registered_at.isoformat() if self.registered_at else None,
        }
