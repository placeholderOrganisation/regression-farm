#!/usr/bin/env bash
# Verify the controller stack is healthy after a deploy.
#
# Checks (in order):
#   1. Compose reports all controller services as running
#   2. Controller API /health returns 200
#   3. Frontend nginx returns 200 on /
#
# Each check has a bounded retry window because containers take a few
# seconds to come up after `compose up -d`.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/root/regression-farm}"
COMPOSE_FILE="docker-compose.controller.yml"
ENV_FILE=".env.controller"

API_HEALTH_URL="${API_HEALTH_URL:-http://localhost:8000/health}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost/}"
TIMEOUT_SECONDS="${HEALTHCHECK_TIMEOUT:-90}"
SLEEP_BETWEEN="${HEALTHCHECK_SLEEP:-3}"

log()  { printf '\033[1;36m[healthcheck-controller]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[healthcheck-controller FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

cd "${REPO_DIR}"

# ---------------------------------------------------------------------------
# 1. Compose services running
# ---------------------------------------------------------------------------
log "compose ps:"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps

required=(postgres controller frontend)
for svc in "${required[@]}"; do
    state="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running --services | grep -Fx "${svc}" || true)"
    if [[ -z "${state}" ]]; then
        log "service ${svc} is not running, dumping last 100 log lines:"
        docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs --tail=100 "${svc}" || true
        fail "service ${svc} is not running"
    fi
    log "  ${svc} is running"
done

# ---------------------------------------------------------------------------
# 2. Controller API /health
# ---------------------------------------------------------------------------
log "polling ${API_HEALTH_URL} (timeout=${TIMEOUT_SECONDS}s)"
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
while true; do
    if curl -fsS --max-time 5 "${API_HEALTH_URL}" >/dev/null; then
        log "  API /health OK"
        break
    fi
    if (( $(date +%s) > deadline )); then
        log "API health timeout; recent controller logs:"
        docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs --tail=100 controller || true
        fail "API ${API_HEALTH_URL} did not become healthy within ${TIMEOUT_SECONDS}s"
    fi
    sleep "${SLEEP_BETWEEN}"
done

# ---------------------------------------------------------------------------
# 3. Frontend
# ---------------------------------------------------------------------------
log "polling ${FRONTEND_URL}"
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
while true; do
    if curl -fsS --max-time 5 "${FRONTEND_URL}" >/dev/null; then
        log "  Frontend OK"
        break
    fi
    if (( $(date +%s) > deadline )); then
        log "frontend health timeout; recent frontend logs:"
        docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs --tail=50 frontend || true
        fail "frontend ${FRONTEND_URL} did not respond within ${TIMEOUT_SECONDS}s"
    fi
    sleep "${SLEEP_BETWEEN}"
done

log "all controller health checks passed"
