#!/usr/bin/env bash
# Deploy the worker stack on a worker droplet.
#
# Invoked by .github/workflows/deploy.yml on a self-hosted runner labeled
# `worker-N`. The same script runs on every worker; the WORKER_NAME env var
# (or .env.worker) keeps each worker's identity distinct.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/root/regression-farm}"
COMPOSE_FILE="docker-compose.worker.yml"
ENV_FILE=".env.worker"

log()  { printf '\033[1;36m[deploy-worker]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy-worker WARN]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[deploy-worker FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

trap 'fail "deployment failed at line $LINENO (last command: $BASH_COMMAND)"' ERR

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
[[ -d "${REPO_DIR}" ]] || fail "repo directory ${REPO_DIR} does not exist; clone it first"
cd "${REPO_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
    fail "${ENV_FILE} not found in ${REPO_DIR}; create it from .env.worker.example before deploying"
fi

command -v docker >/dev/null || fail "docker is not installed on this droplet"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin is not installed"

# Ensure the worker has the right DOCKER_GID so the container user can read
# /var/run/docker.sock. Append it to the env file if missing.
if ! grep -q '^DOCKER_GID=' "${ENV_FILE}"; then
    if getent group docker >/dev/null; then
        host_gid="$(getent group docker | cut -d: -f3)"
        log "appending DOCKER_GID=${host_gid} to ${ENV_FILE}"
        printf '\nDOCKER_GID=%s\n' "${host_gid}" >> "${ENV_FILE}"
    else
        warn "host has no docker group; DOCKER_GID will fall back to 999"
    fi
fi

# ---------------------------------------------------------------------------
# Pull latest code
# ---------------------------------------------------------------------------
PREV_SHA="$(git rev-parse HEAD)"
log "current commit: ${PREV_SHA}"
log "worker name:    ${WORKER_NAME:-<from .env.worker>}"

log "fetching origin/main..."
git fetch origin main --tags

log "resetting working tree to origin/main"
git checkout main
git reset --hard origin/main

NEW_SHA="$(git rev-parse HEAD)"
log "new commit:     ${NEW_SHA}"

if [[ "${PREV_SHA}" == "${NEW_SHA}" ]]; then
    log "code unchanged, but redeploying anyway (manual dispatch or env-only change)"
fi

# ---------------------------------------------------------------------------
# Bring stack down -> rebuild -> bring back up
# ---------------------------------------------------------------------------
log "stopping worker compose stack..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down --remove-orphans

log "building image..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" build --pull

log "starting worker compose stack..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

log "compose status:"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps

# ---------------------------------------------------------------------------
# Health checks
# ---------------------------------------------------------------------------
log "running worker health checks..."
bash "${REPO_DIR}/scripts/healthcheck-worker.sh"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
log "deployment complete"
log "  previous: ${PREV_SHA}"
log "  current:  ${NEW_SHA}"
log "  diff:     git log --oneline ${PREV_SHA}..${NEW_SHA}"
