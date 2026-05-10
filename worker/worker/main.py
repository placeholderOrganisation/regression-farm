"""Worker entrypoint: register, recover orphans, then poll-and-run forever."""
from __future__ import annotations

import logging
import os
import signal
import sys
import time

from .client import ControllerClient
from .config import WorkerConfig
from .identity import load_id, save_id
from .runner import Runner

logger = logging.getLogger("worker")


def _setup_logging(level: str) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


def _register(cfg: WorkerConfig, client: ControllerClient) -> int:
    persisted = load_id(cfg.state_dir)
    info = client.register()
    worker_id = int(info["id"])
    if worker_id != persisted:
        save_id(cfg.state_dir, worker_id)
    return worker_id


def _recover_orphans(client: ControllerClient, worker_id: int) -> None:
    try:
        rows = client.orphan_jobs(worker_id)
    except Exception:
        logger.exception("orphan recovery query failed; continuing")
        return
    for j in rows:
        logger.warning("recovering orphan job %s (status was RUNNING)", j["id"])
        try:
            client.post_status(j["id"], "FAILED", exit_code=-1, reason="WORKER_RESTART")
        except Exception:
            logger.exception("failed to mark orphan job %s as failed", j["id"])


def main() -> int:
    cfg = WorkerConfig()
    _setup_logging(cfg.log_level)

    if not cfg.worker_token:
        logger.error("WORKER_TOKEN not set")
        return 2

    os.makedirs(cfg.state_dir, exist_ok=True)
    os.makedirs(cfg.artifacts_root, exist_ok=True)

    client = ControllerClient(cfg)

    logger.info("registering as %s @ %s -> %s", cfg.name, cfg.hostname, cfg.controller_url)
    worker_id = _register(cfg, client)
    logger.info("registered as worker_id=%s", worker_id)

    _recover_orphans(client, worker_id)

    runner = Runner(cfg, client)

    shutting_down = {"flag": False}

    def _shutdown(signum, _frame):
        logger.info("received signal %s, shutting down", signum)
        shutting_down["flag"] = True
        runner.cancel_current()

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    while not shutting_down["flag"]:
        try:
            job, cancel_current = client.next_job(worker_id)
        except Exception:
            logger.exception("next_job failed; backing off")
            time.sleep(min(cfg.poll_interval * 4, 10))
            continue

        if cancel_current:
            runner.cancel_current()
            continue

        if job is None:
            time.sleep(cfg.poll_interval)
            continue

        logger.info("starting job %s (%s)", job["id"], job["image"])
        try:
            runner.execute(job)
        except Exception:
            logger.exception("runner crashed on job %s", job["id"])
            try:
                client.post_status(job["id"], "FAILED", exit_code=-1, reason="RUNNER_CRASH")
            except Exception:
                logger.exception("could not report runner crash for job %s", job["id"])

    logger.info("worker exiting cleanly")
    return 0


if __name__ == "__main__":
    sys.exit(main())
