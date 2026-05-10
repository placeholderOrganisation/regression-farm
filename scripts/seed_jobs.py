#!/usr/bin/env python3
"""Enqueue a demo batch of jobs against a running controller.

Examples
--------
# default: hits http://localhost:8000 and uses minteksoftware/regression-farm
python scripts/seed_jobs.py

# remote controller
python scripts/seed_jobs.py --controller http://<controller-public-ip>

# bigger batch with custom prefix
python scripts/seed_jobs.py --count 30 --image-prefix youruser/regression-farm
"""
from __future__ import annotations

import argparse
import os
import random
import sys
from urllib import error, request
import json


VARIANTS = [
    {"tag": "pytest-pass",  "name": "smoke pass",   "weight": 4, "timeout": 120},
    {"tag": "pytest-fail",  "name": "regression",   "weight": 3, "timeout": 120},
    {"tag": "pytest-flaky", "name": "flaky suite",  "weight": 4, "timeout": 120},
    {"tag": "pytest-slow",  "name": "long-running", "weight": 1, "timeout": 600},
]


def post_job(controller: str, body: dict) -> dict:
    req = request.Request(
        f"{controller.rstrip('/')}/api/jobs",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--controller", default=os.environ.get("CONTROLLER_URL", "http://localhost:8000"))
    ap.add_argument("--image-prefix", default=os.environ.get("IMAGE_PREFIX", "minteksoftware/regression-farm"))
    ap.add_argument("--count", type=int, default=12)
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    pool = []
    for v in VARIANTS:
        pool.extend([v] * v["weight"])

    enqueued = []
    for i in range(args.count):
        v = random.choice(pool)
        body = {
            "name": f"{v['name']} #{i + 1}",
            "image": f"{args.image_prefix}:{v['tag']}",
            "timeout_seconds": v["timeout"],
            "priority": random.choice([0, 0, 0, 1, 2]),
        }
        try:
            j = post_job(args.controller, body)
            enqueued.append(j)
            print(f"[seed] queued #{j['id']}  {body['image']:60s}  prio={body['priority']}")
        except (error.URLError, error.HTTPError) as exc:
            print(f"[seed] FAILED to enqueue: {exc}", file=sys.stderr)
            return 2

    print(f"\n[seed] {len(enqueued)} jobs queued. Open the dashboard to watch them run.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
