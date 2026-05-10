#!/usr/bin/env bash
# Deploy the controller stack on the controller droplet.
#
# Invoked by .github/workflows/deploy.yml on the self-hosted runner labeled
# `controller`. Idempotent: re-running this is always safe.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/root/regression-farm}"
COMPOSE_FILE="docker-compose.controller.yml"
ENV_FILE=".env.controller"

# ---------------------------------------------------------------------------
# Pretty logging
# ---------------------------------------------------------------------------
log()  { printf '\033[1;36m[deploy-controller]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy-controller WARN]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[deploy-controller FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

trap 'fail "deployment failed at line $LINENO (last command: $BASH_COMMAND)"' ERR

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
[[ -d "${REPO_DIR}" ]] || fail "repo directory ${REPO_DIR} does not exist; clone it first"
cd "${REPO_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
    fail "${ENV_FILE} not found in ${REPO_DIR}; create it from .env.controller.example before deploying"
fi

command -v docker >/dev/null || fail "docker is not installed on this droplet"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin is not installed"

# ---------------------------------------------------------------------------
# Pull latest code
# ---------------------------------------------------------------------------
PREV_SHA="$(git rev-parse HEAD)"
log "current commit: ${PREV_SHA}"

log "fetching origin/main..."
git fetch origin main --tags

log "resetting working tree to origin/main"
git checkout main
git reset --hard origin/main

NEW_SHA="$(git rev-parse HEAD)"
log "new commit:     ${NEW_SHA}"

if [[ "${PREV_SHA}" == "${NEW_SHA}" ]]; then
    log "code unchanged, but redeploying anyway (manual dispatch or scripts/.env-only change)"
fi

# ---------------------------------------------------------------------------
# Bring stack down -> rebuild -> bring back up
# ---------------------------------------------------------------------------
log "stopping controller compose stack..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down --remove-orphans

log "building images..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" build --pull

log "starting controller compose stack..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

log "compose status:"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps

# ---------------------------------------------------------------------------
# Health checks
# ---------------------------------------------------------------------------
log "running health checks..."
bash "${REPO_DIR}/scripts/healthcheck-controller.sh"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
log "deployment complete"
log "  previous: ${PREV_SHA}"
log "  current:  ${NEW_SHA}"
log "  diff:     git log --oneline ${PREV_SHA}..${NEW_SHA}"
