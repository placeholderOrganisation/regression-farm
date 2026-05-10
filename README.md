# Regression Farm

A distributed test-orchestration platform inspired by hardware/software validation farms (Jenkins agents, Buildbot workers, GitLab runners). One **controller** schedules and tracks jobs; multiple **workers** poll for work and run dockerized test suites; a **React dashboard** shows live state and historical analytics.

Deployment topology designed for: 1 controller droplet + 3 worker droplets on DigitalOcean. A `docker-compose.local.yml` is also included for full single-host development.

## Architecture

```
                                    ┌───────────────────────────────────────┐
                                    │           Controller Droplet           │
   browser ──HTTP─►  nginx :80 ──►  │  Flask :8000  (gunicorn 1×8 threads)   │
                                    │  ├ APScheduler (in-process)            │
                                    │  ├ Log parser (junit / pytest / exit)  │
                                    │  └ retention cleanup                   │
                                    │          │                              │
                                    │   PostgreSQL  ◄── named volume          │
                                    │   logs/, artifacts/  ◄── volumes        │
                                    └─────────────────────▲─────────────────┘
                                                          │  REST + bearer
                                                          │  (DO VPC private)
            ┌────────────────────────────┬────────────────┼──────────────────┐
            ▼                            ▼                ▼                  
     Worker Droplet 1            Worker Droplet 2     Worker Droplet 3
     ┌──────────────┐            ┌──────────────┐     ┌──────────────┐
     │ Python worker│            │ Python worker│     │ Python worker│
     │ (poll → run) │            │              │     │              │
     │ /var/run/    │            │              │     │              │
     │  docker.sock │            │              │     │              │
     └──────┬───────┘            └──────┬───────┘     └──────┬───────┘
            ▼                           ▼                    ▼
       host dockerd                host dockerd          host dockerd
            │                           │                    │
            ▼                           ▼                    ▼
       test container             test container        test container
   (pulls minteksoftware/regression-farm:<tag> from Docker Hub)
```

## Repo layout

```
regression-farm/
├── controller/                  Flask app, models, APIs, scheduler, log parser
├── worker/                      Polling worker, Docker runner, log streamer
├── frontend/                    React + Vite + Tailwind dashboard (nginx-served)
├── tests-sample/                4 demo pytest images + build_and_push.sh
├── scripts/seed_jobs.py         Enqueue a mixed demo batch
├── deploy/
│   ├── controller-cloud-init.yml   DO user-data for controller droplet
│   ├── worker-cloud-init.yml       DO user-data for worker droplet
│   └── do-firewall.md              Firewall + VPC reference
├── docker-compose.controller.yml   Production: postgres + controller + frontend
├── docker-compose.worker.yml       Production: worker only
├── docker-compose.local.yml        Dev: everything on one host
├── .env.controller.example
└── .env.worker.example
```

## Quick start (local single-host)

```bash
cp .env.controller.example .env.controller
# Edit WORKER_TOKEN if you like; the local compose file uses its own dev token.

# Linux only: discover host's docker GID so the worker container can read /var/run/docker.sock
# (On macOS / Docker Desktop this is a no-op — the local compose runs the worker as root
# because Docker Desktop presents the socket as root:root inside containers.)
export DOCKER_GID=$(getent group docker | cut -d: -f3 2>/dev/null || echo 999)

docker compose -f docker-compose.local.yml up -d --build

# Watch logs
docker compose -f docker-compose.local.yml logs -f controller worker
```

The dashboard is at <http://localhost:5173>. The API is at <http://localhost:8000>.

Enqueue a demo batch:

```bash
python3 scripts/seed_jobs.py
```

The 4 test images are pulled from the **public** Docker Hub repo `minteksoftware/regression-farm`, so no `docker login` is needed on workers.

To exercise parallelism, scale up the worker:

```bash
docker compose -f docker-compose.local.yml up -d --scale worker=3
```

## Deploy on DigitalOcean (1 controller + 3 workers)

1. **Create a VPC** (or use the default) in the region you want.

2. **Create a controller droplet**
   - Suggested: `s-2vcpu-4gb`, Ubuntu 22.04
   - In the "User Data" field paste `deploy/controller-cloud-init.yml`
     - replace `REPLACE_WITH_YOUR_REPO`, `REPLACE_WITH_STRONG_PASSWORD`, `REPLACE_WITH_OPENSSL_RAND_HEX_32`
   - Generate the worker token once: `openssl rand -hex 32` — keep it; you'll use the same value on workers.

3. **Find the controller's private IP** for the workers to reach:
   ```bash
   doctl compute droplet get <controller-name> --format PrivateIPv4 --no-header
   ```

4. **Create three worker droplets**
   - Suggested: `s-2vcpu-4gb`, Ubuntu 22.04, **same VPC + region**
   - Paste `deploy/worker-cloud-init.yml` into User Data
     - replace `REPLACE_WITH_YOUR_REPO`, `REPLACE_WITH_CONTROLLER_PRIVATE_IP`, `REPLACE_WITH_OPENSSL_RAND_HEX_32`
     - set `WORKER_NAME` uniquely on each (`worker-1`, `worker-2`, `worker-3`)

5. **Configure the firewall** — see [`deploy/do-firewall.md`](deploy/do-firewall.md). Critically, lock dashboard port 80 to your operator IP because the dashboard has no app-level auth.

6. **Verify**
   ```bash
   curl http://<controller-public-ip>/api/workers   # should list 3 workers
   python3 scripts/seed_jobs.py --controller http://<controller-public-ip>
   ```
   Open `http://<controller-public-ip>` in a browser.

## Building the demo test images

`tests-sample/build_and_push.sh` builds and pushes all 4 demo images to Docker Hub. Run on a developer machine (not on workers):

```bash
docker login -u minteksoftware
./tests-sample/build_and_push.sh
# pushes:
#   minteksoftware/regression-farm:pytest-pass
#   minteksoftware/regression-farm:pytest-fail
#   minteksoftware/regression-farm:pytest-flaky
#   minteksoftware/regression-farm:pytest-slow
```

To use a different repo, set `IMAGE_PREFIX`:

```bash
IMAGE_PREFIX=youruser/your-repo ./tests-sample/build_and_push.sh
```

## Job lifecycle

```
QUEUED ──▶ RUNNING ──▶ PASSED
                  └──▶ FAILED          (exit code != 0, parsed result, etc.)
                  └──▶ TIMED_OUT       (worker enforces job.timeout_seconds)
                  └──▶ CANCELLED       (operator from dashboard)
```

Concurrency-safe assignment uses `SELECT ... FOR UPDATE SKIP LOCKED` so any number of workers can poll without ever racing onto the same job.

## API surface

### Worker-facing (require `Authorization: Bearer <WORKER_TOKEN>`)

| Method | Path                                  | Purpose                                       |
| ------ | ------------------------------------- | --------------------------------------------- |
| POST   | `/api/workers/register`               | Idempotent on `(name, hostname)` — returns id |
| GET    | `/api/workers/<id>/orphans`           | Jobs the controller still thinks I'm running  |
| GET    | `/api/workers/<id>/next-job`          | Atomic claim (or `cancel_current=true`)       |
| POST   | `/api/jobs/<id>/status`               | RUNNING / PASSED / FAILED / TIMED_OUT / CANCELLED |
| POST   | `/api/jobs/<id>/logs?offset=N`        | Append-by-offset log stream (idempotent)      |
| POST   | `/api/jobs/<id>/artifacts`            | Multipart upload (e.g. junit.xml)             |

### Dashboard (no auth — protect with the firewall)

| Method     | Path                              | Purpose                          |
| ---------- | --------------------------------- | -------------------------------- |
| GET / POST | `/api/jobs`                       | List with filters / enqueue ad-hoc |
| GET        | `/api/jobs/<id>`                  | Job + parsed test_run + artifacts |
| GET        | `/api/jobs/<id>/logs?since=N`     | Tail bytes from offset N         |
| POST       | `/api/jobs/<id>/cancel`           | Cancel running job               |
| POST       | `/api/jobs/<id>/rerun`            | Clone spec into a new QUEUED job |
| GET        | `/api/workers`                    | List workers                     |
| ALL CRUD   | `/api/schedules`                  | Cron-based recurring jobs        |
| POST       | `/api/schedules/preview`          | Preview next 5 fire times        |
| GET        | `/api/analytics/summary`          | Today's KPIs                     |
| GET        | `/api/analytics/trends?days=14`   | Daily pass/fail series           |
| GET        | `/api/analytics/flaky`            | Flake-rate ranking               |
| GET        | `/api/analytics/workers?days=7`   | Per-worker busy seconds          |
| GET        | `/api/analytics/durations?days=14`| Avg test-run duration            |

## Operations

- **Disk retention**: `LOG_RETENTION_DAYS` (default 30). The scheduler runs a daily cleanup at 03:00 UTC that deletes log/artifact files and DB rows for jobs older than the cutoff.
- **Postgres backups**: Two pragmatic options:
  - Weekly DigitalOcean droplet snapshot (cheapest, recovers everything).
  - `pg_dump` on a cron, push to DO Spaces (more granular, smaller restore unit).
- **Single API process** — gunicorn `--workers 1 --threads 8` so APScheduler isn't duplicated. With 3 workers polling every 2s this still has plenty of headroom.

## Known limitations (deferred)

- **No heartbeats.** Worker liveness is `last_seen` updated passively on every API call.
- **No automatic retries.** Failures are terminal. To re-run a failed job, click **Re-run** on the dashboard (clones the spec into a new QUEUED job).
- **No automatic stuck-job recovery.** If a worker droplet hard-crashes mid-job, that job stays `RUNNING` forever. Operator clicks **Cancel** then **Re-run**. The schema is forward-compatible with adding heartbeats + retries + a stuck-job sweeper later.
- **No TLS automation.** HTTP only; certbot for `https://` is a documented future pass.
- **Single controller / single Postgres.** SPOF. Acceptable at this scale; a future iteration can move PG to DO Managed Postgres and add an HA controller pair.

## License

MIT
