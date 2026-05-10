"""HTTP client for the controller API with bearer auth and bounded retries."""
from __future__ import annotations

import logging
from typing import Any, Optional

import requests
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .config import WorkerConfig

logger = logging.getLogger(__name__)


class ControllerClient:
    def __init__(self, cfg: WorkerConfig):
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"Bearer {cfg.worker_token}"})

    def _url(self, path: str) -> str:
        return f"{self.cfg.controller_url}{path}"

    @retry(
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=15),
        reraise=True,
    )
    def register(self) -> dict:
        r = self.session.post(
            self._url("/api/workers/register"),
            json={
                "name": self.cfg.name,
                "hostname": self.cfg.hostname,
                "public_ip": self.cfg.public_ip,
                "capabilities": self.cfg.capabilities,
            },
            timeout=10,
        )
        r.raise_for_status()
        return r.json()

    @retry(
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=5),
        reraise=True,
    )
    def orphan_jobs(self, worker_id: int) -> list[dict]:
        r = self.session.get(self._url(f"/api/workers/{worker_id}/orphans"), timeout=10)
        r.raise_for_status()
        return r.json()

    @retry(
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=5),
        reraise=True,
    )
    def next_job(self, worker_id: int) -> tuple[Optional[dict], bool]:
        r = self.session.get(self._url(f"/api/workers/{worker_id}/next-job"), timeout=10)
        r.raise_for_status()
        data = r.json()
        return data.get("job"), bool(data.get("cancel_current"))

    @retry(
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    def post_status(self, job_id: int, status: str, exit_code: Optional[int] = None, reason: Optional[str] = None) -> dict:
        body: dict[str, Any] = {"status": status}
        if exit_code is not None:
            body["exit_code"] = exit_code
        if reason is not None:
            body["reason"] = reason
        r = self.session.post(self._url(f"/api/jobs/{job_id}/status"), json=body, timeout=15)
        r.raise_for_status()
        return r.json()

    def append_log(self, job_id: int, offset: int, chunk: bytes) -> tuple[int, Optional[int]]:
        """Append bytes at offset. Returns (new_size, conflicting_size_if_409)."""
        r = self.session.post(
            self._url(f"/api/jobs/{job_id}/logs"),
            params={"offset": offset},
            data=chunk,
            headers={"Content-Type": "application/octet-stream"},
            timeout=30,
        )
        if r.status_code == 409:
            return offset, int(r.json().get("current_size", offset))
        r.raise_for_status()
        return int(r.json().get("size", offset + len(chunk))), None

    def upload_artifact(self, job_id: int, name: str, path: str, content_type: str = "application/octet-stream") -> dict:
        with open(path, "rb") as f:
            files = {"file": (name, f, content_type)}
            r = self.session.post(self._url(f"/api/jobs/{job_id}/artifacts"), files=files, timeout=60)
        r.raise_for_status()
        return r.json()
