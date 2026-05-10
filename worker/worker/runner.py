"""Docker runner.

Pulls the job's image, runs it with a per-job artifacts bind mount, streams
stdout/stderr to the controller, enforces timeout, captures exit code, then
uploads any artifact files (notably ``junit.xml``) before reporting status.
"""
from __future__ import annotations

import logging
import os
import shutil
import threading
import time
import uuid
from typing import Optional

import docker
from docker.errors import APIError, ContainerError, ImageNotFound, NotFound

from .client import ControllerClient
from .config import WorkerConfig

logger = logging.getLogger(__name__)


class Runner:
    def __init__(self, cfg: WorkerConfig, client: ControllerClient):
        self.cfg = cfg
        self.client = client
        self.docker = docker.from_env()
        self._current_container = None
        self._current_lock = threading.Lock()

    def cancel_current(self) -> None:
        with self._current_lock:
            container = self._current_container
        if container is None:
            return
        logger.info("cancel_current: killing container %s", container.id[:12])
        try:
            container.kill()
        except (NotFound, APIError):
            pass

    def execute(self, job: dict) -> None:
        job_id = job["id"]
        image = job["image"]
        timeout = int(job.get("timeout_seconds") or 1800)
        env = job.get("env") or {}
        command = job.get("command")

        artifacts_host_dir = os.path.join(self.cfg.artifacts_root, f"job-{job_id}-{uuid.uuid4().hex[:8]}")
        os.makedirs(artifacts_host_dir, exist_ok=True)

        try:
            self._run_one(job_id, image, command, env, timeout, artifacts_host_dir)
        finally:
            shutil.rmtree(artifacts_host_dir, ignore_errors=True)

    def _run_one(self, job_id: int, image: str, command, env: dict, timeout: int, artifacts_host_dir: str) -> None:
        # 1. Pull image
        try:
            logger.info("job %s: pulling image %s", job_id, image)
            self.docker.images.pull(image)
        except ImageNotFound:
            self.client.post_status(job_id, "FAILED", exit_code=-1, reason="IMAGE_NOT_FOUND")
            return
        except APIError as exc:
            logger.exception("image pull failed for %s", image)
            self.client.post_status(job_id, "FAILED", exit_code=-1, reason=f"IMAGE_PULL_FAILED:{exc}"[:500])
            return

        # 2. Run container detached
        try:
            container = self.docker.containers.run(
                image=image,
                command=command,
                environment=env,
                detach=True,
                stdout=True,
                stderr=True,
                volumes={artifacts_host_dir: {"bind": "/artifacts", "mode": "rw"}},
                remove=False,
            )
        except (APIError, ContainerError) as exc:
            logger.exception("container start failed")
            self.client.post_status(job_id, "FAILED", exit_code=-1, reason=f"CONTAINER_START_FAILED:{exc}"[:500])
            return

        with self._current_lock:
            self._current_container = container

        # 3. Stream logs while waiting on exit
        streamer = LogStreamer(self.client, job_id, container, self.cfg)
        streamer.start()

        timed_out = False
        exit_code: Optional[int] = None
        try:
            try:
                result = container.wait(timeout=timeout)
                exit_code = int(result.get("StatusCode", -1))
            except Exception:
                logger.warning("job %s: timeout reached, killing container", job_id)
                timed_out = True
                try:
                    container.kill()
                except (NotFound, APIError):
                    pass
                try:
                    result = container.wait(timeout=10)
                    exit_code = int(result.get("StatusCode", -1))
                except Exception:
                    exit_code = -1
        finally:
            streamer.stop()
            with self._current_lock:
                self._current_container = None

        # 4. Upload artifacts
        try:
            for fname in os.listdir(artifacts_host_dir):
                fpath = os.path.join(artifacts_host_dir, fname)
                if os.path.isfile(fpath):
                    self.client.upload_artifact(job_id, fname, fpath)
        except Exception:
            logger.exception("artifact upload failed for job %s", job_id)

        # 5. Best-effort cleanup of the container
        try:
            container.remove(force=True)
        except Exception:
            pass

        # 6. Final status
        if timed_out:
            self.client.post_status(job_id, "TIMED_OUT", exit_code=exit_code, reason="JOB_TIMEOUT")
        elif exit_code == 0:
            self.client.post_status(job_id, "PASSED", exit_code=exit_code)
        else:
            self.client.post_status(job_id, "FAILED", exit_code=exit_code, reason="NON_ZERO_EXIT")


class LogStreamer:
    """Background thread that ships container logs to the controller incrementally."""

    def __init__(self, client: ControllerClient, job_id: int, container, cfg: WorkerConfig):
        self.client = client
        self.job_id = job_id
        self.container = container
        self.cfg = cfg
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._offset = 0

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=10)
        self._flush_remaining()

    def _flush(self, buf: bytearray) -> None:
        if not buf:
            return
        try:
            new_size, conflict = self.client.append_log(self.job_id, self._offset, bytes(buf))
            if conflict is not None:
                logger.warning("log offset mismatch for job %s, resyncing to %d", self.job_id, conflict)
                self._offset = conflict
                # Drop the rejected chunk; the next append will pick up fresh bytes.
            else:
                self._offset = new_size
            buf.clear()
        except Exception:
            logger.exception("log append failed for job %s", self.job_id)

    def _run(self) -> None:
        try:
            stream = self.container.logs(stream=True, follow=True, stdout=True, stderr=True)
        except Exception:
            logger.exception("could not attach to log stream")
            return

        buf = bytearray()
        last_flush = time.monotonic()
        try:
            for chunk in stream:
                if self._stop.is_set():
                    break
                if chunk:
                    buf.extend(chunk)
                now = time.monotonic()
                if len(buf) >= self.cfg.log_chunk_bytes or (buf and now - last_flush >= self.cfg.log_chunk_seconds):
                    self._flush(buf)
                    last_flush = now
        except Exception:
            logger.exception("log stream interrupted")
        finally:
            self._flush(buf)

    def _flush_remaining(self) -> None:
        # In case the stream ended before we ticked, drain any final logs.
        try:
            tail = self.container.logs(stdout=True, stderr=True, since=0)
            if tail and len(tail) > self._offset:
                rest = tail[self._offset:]
                buf = bytearray(rest)
                self._flush(buf)
        except Exception:
            pass
