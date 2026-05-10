# CI/CD Deployment

This document explains the push-based deployment pipeline for the Regression
Farm: how it's wired, why it's wired this way, how to operate it, and how to
recover when something goes wrong.

## Topology

```
                                  push to main
                                       │
                                       ▼
                                ┌────────────────┐
                                │ GitHub Actions │
                                │  detect-changes │   (GitHub-hosted runner)
                                └───────┬─────────┘
                                        │ outputs: controller=?, worker=?
              ┌─────────────────────────┼─────────────────────────┐
              │ if controller=true      │ if worker=true          │
              ▼                         ▼                         │
   ┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
   │ deploy-controller  │    │  deploy-worker-1   │    │  deploy-worker-2   │
   │  runs-on:          │    │  runs-on:          │    │  runs-on:          │
   │  [self-hosted,     │    │  [self-hosted,     │    │  [self-hosted,     │
   │   linux,           │    │   linux,           │    │   linux,           │
   │   controller]      │    │   worker, worker-1]│    │   worker, worker-2]│
   └─────────┬──────────┘    └────────┬───────────┘    └────────┬───────────┘
             │                        │                          │
             ▼                        ▼                          ▼
    Controller droplet         Worker-1 droplet           Worker-2 droplet
                                                                 ┌────────────────────┐
                                                                 │  deploy-worker-3   │
                                                                 │   ... worker-3 ... │
                                                                 └────────┬───────────┘
                                                                          ▼
                                                                  Worker-3 droplet
```

Each droplet hosts a GitHub Actions self-hosted runner with role-specific
labels. The workflow targets exact labels so a worker-1 deploy can never land
on worker-2.

## 1. Why self-hosted runners instead of SSH?

Common alternative: GitHub-hosted runner connects to each droplet over SSH and
runs commands. It works, but has real downsides for this project:

- **Inbound SSH must be open** to GitHub's IP ranges (or a static jump box) —
  a meaningful attack surface increase versus VPC-internal traffic only.
- **Long-lived SSH keys** must live in GitHub Secrets and rotate manually.
- **No native parallelism per droplet** — you write loops over hosts in the
  workflow rather than letting GitHub schedule one job per host.
- **Slow** — SSH startup + remote shell quirks add seconds per step.

Self-hosted runners flip the trust direction: each droplet *outbounds* a
long-poll connection to GitHub, picks up jobs, runs them locally. No inbound
exposure, no SSH keys in Secrets, and parallelism is automatic — three
worker jobs schedule onto three runners simultaneously. The trade-off is you
must keep the runners patched and the repo private (or restrict fork PRs)
because runners execute repo code.

This is the same pattern Buildbot, Jenkins agents, and GitLab runners use.

## 2. How path-based deployment works

`.github/workflows/deploy.yml` has a `detect-changes` job that runs on a
GitHub-hosted runner and uses [`dorny/paths-filter`](https://github.com/dorny/paths-filter)
to compute two booleans:

| Output       | True when any of these paths changed in the push                      |
| ------------ | --------------------------------------------------------------------- |
| `controller` | `controller/**`, `frontend/**`, `docker-compose.controller.yml`, `.env.controller.example`, `deploy/controller-cloud-init.yml`, `scripts/**`, the workflow file itself |
| `worker`     | `worker/**`, `docker-compose.worker.yml`, `.env.worker.example`, `deploy/worker-cloud-init.yml`, `scripts/**`, the workflow file itself |

The downstream jobs are gated by `if: needs.detect-changes.outputs.<flag> == 'true'`
so unrelated changes (e.g. README only) deploy nothing.

`scripts/**` and the workflow file appear in **both** filters on purpose — a
change there could affect either side, so we replay everywhere to be safe.

## 3. How controller changes deploy only to the controller droplet

A push that only touches `controller/`, `frontend/`, `docker-compose.controller.yml`,
or related files flips `controller=true` and `worker=false`. Only the
`deploy-controller` job is scheduled. It is pinned to:

```yaml
runs-on: [self-hosted, linux, controller]
```

GitHub will route it exclusively to the runner registered with the `controller`
label, which lives on the controller droplet. The job invokes
`scripts/deploy-controller.sh` from the freshly-pulled repo on disk.

## 4. How worker changes deploy to all worker droplets

A push that touches `worker/**` or related files flips `worker=true`. The
workflow declares **three separate jobs** — `deploy-worker-1`, `deploy-worker-2`,
`deploy-worker-3` — each pinned to its specific label set:

```yaml
deploy-worker-1: runs-on: [self-hosted, linux, worker, worker-1]
deploy-worker-2: runs-on: [self-hosted, linux, worker, worker-2]
deploy-worker-3: runs-on: [self-hosted, linux, worker, worker-3]
```

GitHub schedules them in parallel. The deterministic per-worker labels prevent
a common pitfall: if you only used the generic `worker` label, GitHub could
pick *any* available worker runner — possibly the same one three times — and
your other two droplets would silently miss the deploy.

## 5. Manual deployment

Useful when you want to redeploy without changing code (e.g. you fixed an env
var, or want to verify a runner is healthy):

```bash
gh workflow run deploy.yml \
    --field deploy_controller=true \
    --field deploy_workers=false

# Or via the GitHub UI: Actions → Deploy → Run workflow
```

`workflow_dispatch` inputs override path detection. You can deploy controller
only, workers only, or both.

## 6. Concurrency

```yaml
concurrency:
  group: deploy-main
  cancel-in-progress: false
```

Multiple pushes to `main` queue up; they don't run in parallel and don't cancel
each other. This guarantees that if you push commit A then commit B a few
seconds later, A finishes deploying before B starts — you're never in a state
where one droplet is on B and another is mid-deploy of A.

## 7. Debugging failed deployments

The workflow surfaces three layers of detail:

1. **GitHub Actions log** — the runner's stdout for each step, including the
   colored `[deploy-controller]` and `[healthcheck-controller]` messages from
   the bash scripts. Click the failing step in the GitHub UI.
2. **Last-N container logs** — when a health check fails, the script dumps
   `docker compose logs --tail=100 <service>` so you have the application's
   startup output right there in the Actions log.
3. **The runner host itself** — sometimes you need to SSH in:

   ```bash
   ssh root@<droplet>
   cd /root/regression-farm
   docker compose -f docker-compose.controller.yml ps
   docker compose -f docker-compose.controller.yml logs --tail=200 controller
   ```

Common failure modes:

| Symptom                                          | Likely cause                                       |
| ------------------------------------------------ | -------------------------------------------------- |
| `repo directory ... does not exist`              | First-time setup wasn't done; clone repo to `/root/regression-farm` |
| `.env.controller not found` / `.env.worker not found` | env file wasn't dropped on the droplet by hand    |
| `API ... did not become healthy within 90s`      | Migration error — check `controller` logs         |
| Worker stays unregistered                        | `WORKER_TOKEN` mismatch between controller and worker `.env` |
| Worker can't reach controller                    | `CONTROLLER_URL` uses public IP instead of VPC private IP, or VPC firewall blocks 8000 |
| Healthcheck hangs on frontend                    | `frontend` build crashed; `docker compose logs frontend` |

## 8. Restart a stuck runner

```bash
ssh root@<droplet>

# Find the service name (it includes <owner>-<repo>-<runner-name>)
systemctl list-units --all | grep actions.runner

# Restart it
systemctl restart actions.runner.*<runner-name>.service

# Tail the runner log to confirm it reconnected
journalctl -fu actions.runner.*<runner-name>.service
# Look for: "Listening for Jobs"
```

If `systemctl restart` doesn't help, fully reinstall the runner from the setup
doc — it's quick and idempotent because of the `--replace` flag.

## 9. View runner logs

```bash
# Live tail of the systemd-managed runner (includes job stdout)
journalctl -fu actions.runner.*regression-farm-controller.service

# On-disk diagnostic logs (per-job)
ls -la /home/actions-runner/runner/_diag/
tail -f /home/actions-runner/runner/_diag/Runner_*.log

# Per-job worker logs (where individual step output is written)
ls -la /home/actions-runner/runner/_diag/Worker_*.log
```

The `journalctl` view is usually enough — every step the workflow runs is
echoed there, plus the runner's own connection messages.

## 10. Rollback

There are two rollback strategies, in increasing levels of polish.

### Quick: SSH and `git checkout` a previous SHA

```bash
ssh root@<controller-droplet>
cd /root/regression-farm

# Find the previous good commit
git log --oneline -n 20

# Pin to it
git fetch origin
git checkout <previous_commit_sha>

# Redeploy with the old code
docker compose -f docker-compose.controller.yml --env-file .env.controller down
docker compose -f docker-compose.controller.yml --env-file .env.controller up -d --build
bash scripts/healthcheck-controller.sh
```

For workers, repeat on each worker droplet:

```bash
ssh root@<worker-N-droplet>
cd /root/regression-farm
git fetch origin
git checkout <previous_commit_sha>
docker compose -f docker-compose.worker.yml --env-file .env.worker down
docker compose -f docker-compose.worker.yml --env-file .env.worker up -d --build
bash scripts/healthcheck-worker.sh
```

A detached HEAD is fine here. Note that the next push to `main` will pull
the working tree forward again — so this is for "stop the bleeding," not
permanent rollback.

### Cleaner: tag releases and revert via PR

Adopt a release-tag convention as the system matures:

```bash
# Cut a release whenever a deploy is verified good
git tag release-2026-05-07 && git push origin release-2026-05-07

# To roll back, revert the bad commit on main with a PR:
git revert <bad-commit-sha>
git push origin main
# The deploy workflow runs on the revert commit and brings every droplet back.
```

This keeps GitHub as the source of truth — there's no out-of-band droplet
drift to remember.

## 11. Interview explanation

> *"I built a GitHub Actions based CI/CD pipeline using self-hosted runners
> on DigitalOcean droplets. Each droplet registers as a runner with
> role-based labels — `controller` on the controller droplet and
> `worker-1`, `worker-2`, `worker-3` on the worker droplets — so the
> controller and worker nodes can be deployed independently. The workflow
> performs path-based change detection: controller and frontend changes
> deploy only to the controller droplet, while worker changes fan out to
> all three worker droplets in parallel. Each node pulls the latest commit,
> rebuilds its Docker Compose stack, restarts services, and runs health
> checks against the API and frontend (or, on workers, against the Docker
> daemon and the worker container's registration log). Concurrency
> controls queue overlapping pushes so two deploys never run on top of each
> other. This gave me a realistic distributed deployment model similar to
> what you'd see in validation farms or production automation
> infrastructure — outbound-only runner trust, deterministic per-host job
> routing, and idempotent bash deploys with bounded health checks — without
> the operational weight of Kubernetes, ArgoCD, or a full Ansible
> inventory."*

## 12. Security practices

- **Repo is private (recommended).** Self-hosted runners execute repository
  code; a public repo means anyone opening a PR can run code on your droplets.
  If the repo must be public, set
  *Settings → Actions → General → Fork pull request workflows → Require
  approval for first-time contributors* and ideally restrict outbound
  permissions.
- **`.env.controller` and `.env.worker` are never committed.** They live on
  each droplet with `chmod 600`. Only `.env.*.example` files (with placeholder
  values) are in git.
- **No secrets in workflow logs.** The deploy scripts never `echo $WORKER_TOKEN`
  or similar; only paths, SHAs, and Docker output are emitted.
- **Runner runs as `actions-runner`, not root.** It has membership in the
  `docker` group only because the deploy scripts need to run `docker compose`.
  No passwordless sudo is configured.
- **Inbound is locked at the firewall.** DigitalOcean Cloud Firewall rules
  (see [do-firewall.md](do-firewall.md)) restrict the controller to
  SSH+HTTP from your operator IP and port 8000 from the VPC; workers expose
  only SSH from your operator IP.
- **Worker→controller traffic uses the DO VPC private network** with a shared
  bearer `WORKER_TOKEN`. The token is rotated by changing the value in both
  `.env.controller` and every `.env.worker`, then re-running the deploy
  workflow with `deploy_controller=true` and `deploy_workers=true`.
- **Don't add the runner user to sudoers.** If a deploy step ever needs
  privileged access you don't have, prefer giving the runner user explicit
  group membership for that resource (like `docker`) rather than blanket
  sudo.
- **Pin the runner version** in the setup docs (`RUNNER_VERSION="2.319.1"` at
  the time of writing). Update periodically and re-register; GitHub will
  eventually refuse very old runners.
