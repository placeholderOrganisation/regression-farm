#!/usr/bin/env bash
# Verify the worker stack is healthy after a deploy.
#
# Checks:
#   1. Docker daemon is reachable from inside the worker container's host
#      (i.e. /var/run/docker.sock works).
#   2. Worker container is running per `docker compose ps`.
#   3. Recent worker logs contain a "registered" message (best-effort).
#      If the marker isn't found within the timeout, the last 50 log lines
#      are dumped and the script fails.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/root/regression-farm}"
COMPOSE_FILE="docker-compose.worker.yml"
ENV_FILE=".env.worker"

TIMEOUT_SECONDS="${HEALTHCHECK_TIMEOUT:-60}"
SLEEP_BETWEEN="${HEALTHCHECK_SLEEP:-3}"
LOG_MARKER_REGEX="${WORKER_LOG_MARKER:-registered as worker_id}"

log()  { printf '\033[1;36m[healthcheck-worker]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[healthcheck-worker FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

cd "${REPO_DIR}"

# ---------------------------------------------------------------------------
# 1. Docker daemon reachable
# ---------------------------------------------------------------------------
log "checking host docker daemon"
if ! docker info >/dev/null 2>&1; then
    fail "host docker daemon is not reachable; check that dockerd is running"
fi
log "  docker daemon OK"

# ---------------------------------------------------------------------------
# 2. Worker container is running
# ---------------------------------------------------------------------------
log "compose ps:"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps

running="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running --services | grep -Fx worker || true)"
if [[ -z "${running}" ]]; then
    log "worker container is not running. Last 50 log lines:"
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs --tail=50 worker || true
    fail "worker container is not in running state"
fi
log "  worker container is running"

# ---------------------------------------------------------------------------
# 3. Wait for the worker to log a successful registration
# ---------------------------------------------------------------------------
log "waiting for log marker '${LOG_MARKER_REGEX}' (timeout=${TIMEOUT_SECONDS}s)"
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
while true; do
    if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs --tail=200 worker 2>/dev/null \
        | grep -E "${LOG_MARKER_REGEX}" >/dev/null; then
        log "  worker registered with controller"
        break
    fi
    if (( $(date +%s) > deadline )); then
        log "marker not found within timeout; dumping last 50 log lines:"
        docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs --tail=50 worker || true
        fail "worker did not log a successful registration within ${TIMEOUT_SECONDS}s"
    fi
    sleep "${SLEEP_BETWEEN}"
done

log "all worker health checks passed"
