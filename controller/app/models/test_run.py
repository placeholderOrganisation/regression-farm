from __future__ import annotations

from datetime import datetime

from ..extensions import db


class TestRun(db.Model):
    __tablename__ = "test_runs"

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, unique=True)
    total_tests = db.Column(db.Integer, nullable=True)
    passed = db.Column(db.Integer, nullable=True)
    failed = db.Column(db.Integer, nullable=True)
    skipped = db.Column(db.Integer, nullable=True)
    duration_seconds = db.Column(db.Float, nullable=True)
    failure_reason = db.Column(db.Text, nullable=True)
    parsed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    job = db.relationship("Job", back_populates="test_run")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "job_id": self.job_id,
            "total_tests": self.total_tests,
            "passed": self.passed,
            "failed": self.failed,
            "skipped": self.skipped,
            "duration_seconds": self.duration_seconds,
            "failure_reason": self.failure_reason,
            "parsed_at": self.parsed_at.isoformat() if self.parsed_at else None,
        }
