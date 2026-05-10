"""Persist this worker's id to a file so restarts don't leak ghost rows.

Combined with the controller's idempotent (name, hostname) registration this
keeps the workers table clean across crashes and droplet reboots.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


def _id_file(state_dir: str) -> str:
    return os.path.join(state_dir, "worker.id")


def load_id(state_dir: str) -> Optional[int]:
    path = _id_file(state_dir)
    if not os.path.exists(path):
        return None
    try:
        with open(path) as f:
            return int(f.read().strip())
    except (OSError, ValueError):
        logger.warning("could not read persisted worker id at %s", path)
        return None


def save_id(state_dir: str, worker_id: int) -> None:
    os.makedirs(state_dir, exist_ok=True)
    path = _id_file(state_dir)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        f.write(str(worker_id))
    os.replace(tmp, path)
