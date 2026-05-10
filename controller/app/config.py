from __future__ import annotations

import os
from urllib.parse import quote_plus


def _build_db_url() -> str:
    if "DATABASE_URL" in os.environ:
        return os.environ["DATABASE_URL"]
    user = os.environ.get("POSTGRES_USER", "postgres")
    pwd = quote_plus(os.environ.get("POSTGRES_PASSWORD", "postgres"))
    host = os.environ.get("POSTGRES_HOST", "postgres")
    port = os.environ.get("POSTGRES_PORT", "5432")
    db = os.environ.get("POSTGRES_DB", "regression_farm")
    return f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{db}"


class Config:
    SQLALCHEMY_DATABASE_URI = _build_db_url()
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 1800,
    }

    WORKER_TOKEN = os.environ.get("WORKER_TOKEN", "")

    LOG_DIR = os.environ.get("LOG_DIR", "/var/lib/regression-farm/logs")
    ARTIFACT_DIR = os.environ.get("ARTIFACT_DIR", "/var/lib/regression-farm/artifacts")
    LOG_RETENTION_DAYS = int(os.environ.get("LOG_RETENTION_DAYS", "30"))

    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

    SCHEDULER_ENABLED = os.environ.get("SCHEDULER_ENABLED", "true").lower() == "true"
    SCHEDULER_TICK_SECONDS = int(os.environ.get("SCHEDULER_TICK_SECONDS", "15"))
    SCHEDULER_MISFIRE_GRACE = int(os.environ.get("SCHEDULER_MISFIRE_GRACE", "300"))

    DEFAULT_JOB_TIMEOUT = int(os.environ.get("DEFAULT_JOB_TIMEOUT", "1800"))
    MAX_LOG_CHUNK_BYTES = int(os.environ.get("MAX_LOG_CHUNK_BYTES", str(2 * 1024 * 1024)))
