from __future__ import annotations

from datetime import datetime

from sqlalchemy.dialects.postgresql import JSONB

from ..extensions import db


class Schedule(db.Model):
    __tablename__ = "schedules"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    cron_expr = db.Column(db.String(128), nullable=False)
    image = db.Column(db.String(512), nullable=False)
    command = db.Column(JSONB, nullable=True)
    env = db.Column(JSONB, nullable=False, default=dict)
    timeout_seconds = db.Column(db.Integer, nullable=False, default=1800)
    priority = db.Column(db.Integer, nullable=False, default=0)
    enabled = db.Column(db.Boolean, nullable=False, default=True)
    last_triggered_at = db.Column(db.DateTime, nullable=True)
    next_run_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "cron_expr": self.cron_expr,
            "image": self.image,
            "command": self.command,
            "env": self.env or {},
            "timeout_seconds": self.timeout_seconds,
            "priority": self.priority,
            "enabled": self.enabled,
            "last_triggered_at": self.last_triggered_at.isoformat() if self.last_triggered_at else None,
            "next_run_at": self.next_run_at.isoformat() if self.next_run_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
