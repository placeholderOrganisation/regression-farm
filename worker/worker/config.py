from __future__ import annotations

import json
import os
import socket
from dataclasses import dataclass, field


def _hostname() -> str:
    return os.environ.get("HOSTNAME") or socket.gethostname()


@dataclass
class WorkerConfig:
    controller_url: str = field(default_factory=lambda: os.environ.get("CONTROLLER_URL", "http://controller:8000").rstrip("/"))
    worker_token: str = field(default_factory=lambda: os.environ.get("WORKER_TOKEN", ""))
    name: str = field(default_factory=lambda: os.environ.get("WORKER_NAME", "worker-1"))
    hostname: str = field(default_factory=_hostname)
    public_ip: str | None = field(default_factory=lambda: os.environ.get("WORKER_PUBLIC_IP"))
    poll_interval: float = field(default_factory=lambda: float(os.environ.get("POLL_INTERVAL", "2")))
    log_chunk_seconds: float = field(default_factory=lambda: float(os.environ.get("LOG_CHUNK_SECONDS", "2")))
    log_chunk_bytes: int = field(default_factory=lambda: int(os.environ.get("LOG_CHUNK_BYTES", str(64 * 1024))))
    state_dir: str = field(default_factory=lambda: os.environ.get("WORKER_STATE_DIR", "/var/lib/regression-farm-worker"))
    artifacts_root: str = field(default_factory=lambda: os.environ.get("WORKER_ARTIFACTS_ROOT", "/tmp/rf-artifacts"))
    log_level: str = field(default_factory=lambda: os.environ.get("LOG_LEVEL", "INFO"))

    @property
    def capabilities(self) -> dict:
        raw = os.environ.get("WORKER_CAPABILITIES", "")
        if not raw:
            return {"os": "linux", "arch": "amd64"}
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"raw": raw}
