"""Log/junit parser with three-tier fallback strategy."""
from __future__ import annotations

import logging
import os
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from ..extensions import db
from ..models import Artifact, Job, JobStatus, LogFile, TestRun

logger = logging.getLogger(__name__)


@dataclass
class ParseResult:
    total: Optional[int] = None
    passed: Optional[int] = None
    failed: Optional[int] = None
    skipped: Optional[int] = None
    duration: Optional[float] = None
    failure_reason: Optional[str] = None


_PYTEST_SUMMARY = re.compile(
    r"(?:(?P<failed>\d+)\s+failed)?[, ]*"
    r"(?:(?P<passed>\d+)\s+passed)?[, ]*"
    r"(?:(?P<skipped>\d+)\s+skipped)?[\s\S]*?"
    r"in\s+(?P<duration>[\d.]+)s",
    re.IGNORECASE,
)


def _parse_junit(path: str) -> Optional[ParseResult]:
    try:
        tree = ET.parse(path)
    except (ET.ParseError, OSError) as exc:
        logger.warning("junit parse failed for %s: %s", path, exc)
        return None
    root = tree.getroot()
    suites = [root] if root.tag == "testsuite" else root.findall("testsuite")
    if not suites:
        return None
    total = sum(int(s.get("tests", "0") or 0) for s in suites)
    failed = sum(int(s.get("failures", "0") or 0) + int(s.get("errors", "0") or 0) for s in suites)
    skipped = sum(int(s.get("skipped", "0") or 0) for s in suites)
    passed = total - failed - skipped
    duration = sum(float(s.get("time", "0") or 0) for s in suites)
    failure_reason = None
    if failed:
        for s in suites:
            for case in s.findall("testcase"):
                fail = case.find("failure") or case.find("error")
                if fail is not None:
                    msg = fail.get("message") or (fail.text or "")
                    failure_reason = msg.strip().splitlines()[0][:500]
                    break
            if failure_reason:
                break
    return ParseResult(total=total, passed=passed, failed=failed, skipped=skipped, duration=duration, failure_reason=failure_reason)


def _parse_pytest_stdout(path: str) -> Optional[ParseResult]:
    try:
        with open(path, "r", errors="replace") as f:
            text = f.read()
    except OSError:
        return None
    m = _PYTEST_SUMMARY.search(text)
    if not m:
        return None
    passed = int(m.group("passed") or 0)
    failed = int(m.group("failed") or 0)
    skipped = int(m.group("skipped") or 0)
    total = passed + failed + skipped
    duration = float(m.group("duration") or 0)
    failure_reason = None
    if failed:
        # last 10 non-empty lines as a hint
        lines = [ln for ln in text.splitlines() if ln.strip()]
        failure_reason = "\n".join(lines[-10:])[:1000]
    return ParseResult(total=total, passed=passed, failed=failed, skipped=skipped, duration=duration, failure_reason=failure_reason)


def _exit_code_fallback(job: Job, log_path: Optional[str]) -> ParseResult:
    failure_reason = None
    if job.exit_code and job.exit_code != 0 and log_path and os.path.exists(log_path):
        try:
            with open(log_path, "r", errors="replace") as f:
                tail = f.readlines()[-10:]
            failure_reason = "".join(tail)[:1000]
        except OSError:
            pass
    return ParseResult(failure_reason=failure_reason)


def parse_job(job_id: int) -> None:
    """Parse logs/artifacts for a finished job and upsert TestRun row."""
    job = db.session.get(Job, job_id)
    if job is None:
        return
    if job.status not in {JobStatus.PASSED.value, JobStatus.FAILED.value, JobStatus.TIMED_OUT.value, JobStatus.CANCELLED.value}:
        return

    junit_artifact: Optional[Artifact] = next(
        (a for a in job.artifacts if a.name.lower().endswith("junit.xml") or a.name.lower() == "junit.xml"),
        None,
    )
    log: Optional[LogFile] = job.logs[0] if job.logs else None

    result: Optional[ParseResult] = None
    if junit_artifact and os.path.exists(junit_artifact.path):
        result = _parse_junit(junit_artifact.path)
    if result is None and log and os.path.exists(log.path):
        result = _parse_pytest_stdout(log.path)
    if result is None:
        result = _exit_code_fallback(job, log.path if log else None)

    duration = result.duration
    if duration is None and job.started_at and job.finished_at:
        duration = (job.finished_at - job.started_at).total_seconds()

    test_run = job.test_run or TestRun(job_id=job.id)
    test_run.total_tests = result.total
    test_run.passed = result.passed
    test_run.failed = result.failed
    test_run.skipped = result.skipped
    test_run.duration_seconds = duration
    test_run.failure_reason = result.failure_reason
    test_run.parsed_at = datetime.utcnow()
    if job.test_run is None:
        db.session.add(test_run)

    if not job.failure_reason and result.failure_reason and job.status != JobStatus.PASSED.value:
        job.failure_reason = (result.failure_reason or "")[:500]

    db.session.commit()
