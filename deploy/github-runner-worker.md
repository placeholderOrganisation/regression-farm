# GitHub Self-Hosted Runner — Worker Droplets

This guide installs a GitHub Actions self-hosted runner on **each** worker
droplet so the `deploy-worker-1`, `deploy-worker-2`, `deploy-worker-3` jobs
in `.github/workflows/deploy.yml` can fan out a worker deploy in parallel.

The same procedure is repeated three times — once per droplet — with a
**different label set per droplet** so each job lands on the intended host.

## Per-worker labels

| Droplet     | Labels                                       | Runner name                |
| ----------- | -------------------------------------------- | -------------------------- |
| Worker 1    | `self-hosted, linux, worker, worker-1`       | `regression-farm-worker-1` |
| Worker 2    | `self-hosted, linux, worker, worker-2`       | `regression-farm-worker-2` |
| Worker 3    | `self-hosted, linux, worker, worker-3`       | `regression-farm-worker-3` |

Why both `worker` **and** `worker-N`? `worker` is a logical group (handy for
future "deploy any free worker" jobs). `worker-N` is the deterministic
selector — the deploy workflow targets `[self-hosted, linux, worker-1]` so
GitHub can never route the worker-1 job to a different droplet.

> **Same security warning as the controller doc**: keep this repo private
> while self-hosted runners are attached, or restrict fork-PR workflows in
> *Settings → Actions → General*. Self-hosted runners execute repository code
> on your machine.

---

## 1. Create the `actions-runner` user (on every worker)

```bash
ssh root@<worker-N-public-ip>

adduser --disabled-password --gecos "GitHub Actions runner" actions-runner
usermod -aG docker actions-runner
```

## 2. Make the repo writable by the runner user

```bash
mkdir -p /opt/regression-farm
chown -R actions-runner:actions-runner /opt/regression-farm
sudo -u actions-runner -H git clone https://github.com/<owner>/<repo>.git /opt/regression-farm/repo
ln -s /opt/regression-farm/repo /root/regression-farm

# Drop your worker env file in (NOT committed to git)
sudo -u actions-runner -H cp /opt/regression-farm/.env.worker /opt/regression-farm/repo/.env.worker
chmod 600 /opt/regression-farm/repo/.env.worker
```

`.env.worker` should already be set up correctly from when you provisioned the
droplet — see [.env.worker.example](../.env.worker.example) for the full schema.
Critical fields that **must differ per droplet**:

```ini
WORKER_NAME=worker-1     # worker-2, worker-3 on the other droplets
WORKER_PUBLIC_IP=...     # optional; this droplet's public IP
```

`CONTROLLER_URL`, `WORKER_TOKEN`, and `POLL_INTERVAL` are identical across all
three workers.

## 3. Download the runner

Get a fresh registration token from GitHub for each droplet:
*Settings → Actions → Runners → New self-hosted runner → Linux x64*. Copy the
`<TOKEN>` it shows you.

```bash
sudo -u actions-runner -H bash <<'EOF'
mkdir -p ~/runner && cd ~/runner

RUNNER_VERSION="2.319.1"
RUNNER_TARBALL="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

curl -fsSL -o "${RUNNER_TARBALL}" \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_TARBALL}"

tar xzf "${RUNNER_TARBALL}"
EOF
```

## 4. Register the runner — labels differ per droplet

### On worker-1

```bash
sudo -u actions-runner -H bash <<'EOF'
cd ~/runner
./config.sh \
    --url https://github.com/<owner>/<repo> \
    --token <TOKEN_FOR_WORKER_1> \
    --name regression-farm-worker-1 \
    --labels self-hosted,linux,worker,worker-1 \
    --work _work \
    --unattended \
    --replace
EOF
```

### On worker-2

```bash
sudo -u actions-runner -H bash <<'EOF'
cd ~/runner
./config.sh \
    --url https://github.com/<owner>/<repo> \
    --token <TOKEN_FOR_WORKER_2> \
    --name regression-farm-worker-2 \
    --labels self-hosted,linux,worker,worker-2 \
    --work _work \
    --unattended \
    --replace
EOF
```

### On worker-3

```bash
sudo -u actions-runner -H bash <<'EOF'
cd ~/runner
./config.sh \
    --url https://github.com/<owner>/<repo> \
    --token <TOKEN_FOR_WORKER_3> \
    --name regression-farm-worker-3 \
    --labels self-hosted,linux,worker,worker-3 \
    --work _work \
    --unattended \
    --replace
EOF
```

## 5. Install as a systemd service (each droplet)

```bash
cd /home/actions-runner/runner
./svc.sh install actions-runner
./svc.sh start

systemctl status actions.runner.*regression-farm-worker-*.service
```

After this step, refresh GitHub's runners page. You should see all three
listed as **Idle** with their distinct labels:

```
regression-farm-worker-1    Idle    self-hosted, linux, worker, worker-1
regression-farm-worker-2    Idle    self-hosted, linux, worker, worker-2
regression-farm-worker-3    Idle    self-hosted, linux, worker, worker-3
```

## 6. End-to-end smoke test

```bash
gh workflow run deploy.yml --field deploy_controller=false --field deploy_workers=true
gh run watch
```

You should see three deploy jobs run in parallel — each pinned to its own
worker — and pass health checks.

## Operations

```bash
# Check / tail / restart a runner
systemctl status   actions.runner.*regression-farm-worker-N.service
journalctl -fu     actions.runner.*regression-farm-worker-N.service
systemctl restart  actions.runner.*regression-farm-worker-N.service

# View runner logs at the file level (job output also goes here)
ls -la /home/actions-runner/runner/_diag/

# Decommission a runner (run as actions-runner)
cd ~/runner
./svc.sh stop && ./svc.sh uninstall
./config.sh remove --token <NEW-REMOVAL-TOKEN>
```

## Security checklist (per worker)

- [ ] Runner runs as `actions-runner`, not root
- [ ] `actions-runner` is in the `docker` group only because deploy scripts need it
- [ ] Repo is private, or fork-PR workflows are restricted
- [ ] `.env.worker` is `chmod 600`, never committed
- [ ] `WORKER_NAME` is unique on each droplet
- [ ] DigitalOcean Cloud Firewall blocks all inbound except SSH from your IP
- [ ] Worker-to-controller traffic flows over the DO VPC private network only
