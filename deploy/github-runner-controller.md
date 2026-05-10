# GitHub Self-Hosted Runner — Controller Droplet

This guide installs a GitHub Actions self-hosted runner on the **controller**
droplet so the `deploy-controller` job in `.github/workflows/deploy.yml` can
redeploy the controller stack on every push to `main`.

> Important security note (read before starting):
>
> Self-hosted runners execute code from your repository on your own machine.
> If your repo is **public**, anyone who opens a PR can run arbitrary code on
> the runner. Keep this repo **private** while you have self-hosted runners
> attached, or restrict workflow execution under
> *Settings → Actions → General → Fork pull request workflows*.

## Labels for this runner

```
self-hosted, linux, controller
```

The first two are added automatically. You will add `controller` during
registration.

---

## 1. Create the `actions-runner` user

We do **not** run the runner as `root`, even though the deploy scripts target
`/root/regression-farm`. The runner user gets passwordless `sudo` for the
specific commands it needs (in our case it just needs to talk to Docker, so
membership in the `docker` group is enough — no sudo required).

```bash
ssh root@<controller-public-ip>

# Create a dedicated unprivileged user
adduser --disabled-password --gecos "GitHub Actions runner" actions-runner

# Allow it to run Docker (so deploy scripts can do `docker compose ...`)
usermod -aG docker actions-runner

# Verify
id actions-runner
# uid=1000(actions-runner) gid=1000(actions-runner) groups=1000(actions-runner),999(docker)
```

## 2. Make the repo readable + writable by the runner user

The deploy scripts assume the repo lives at `/root/regression-farm`. To let
`actions-runner` write to that path without running as root, retarget the repo
to a path the user owns and symlink it:

```bash
# As root: clone the repo into a path the runner user can write to
mkdir -p /opt/regression-farm
chown -R actions-runner:actions-runner /opt/regression-farm

sudo -u actions-runner -H git clone https://github.com/<your-org>/regression-farm.git /opt/regression-farm/repo

# Symlink so /root/regression-farm and the deploy scripts keep working
ln -s /opt/regression-farm/repo /root/regression-farm

# Verify
ls -ld /root/regression-farm /opt/regression-farm/repo
```

Now copy your `.env.controller` into the cloned repo (this file is **not** in
git on purpose):

```bash
sudo -u actions-runner -H cp /opt/regression-farm/.env.controller /opt/regression-farm/repo/.env.controller
chmod 600 /opt/regression-farm/repo/.env.controller
```

## 3. Download and install the runner

Replace `<owner>/<repo>` and `<TOKEN>` with values from
`https://github.com/<owner>/<repo>/settings/actions/runners/new`. Click
*New self-hosted runner → Linux x64*; GitHub will print the exact `./config.sh`
command including a one-time registration token.

```bash
sudo -u actions-runner -H bash <<'EOF'
mkdir -p ~/runner && cd ~/runner

# Pin a known runner release. Bump these two values periodically; the latest
# release is at https://github.com/actions/runner/releases.
RUNNER_VERSION="2.319.1"
RUNNER_TARBALL="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

curl -fsSL -o "${RUNNER_TARBALL}" \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_TARBALL}"

tar xzf "${RUNNER_TARBALL}"
EOF
```

## 4. Register the runner with the `controller` label

```bash
sudo -u actions-runner -H bash <<'EOF'
cd ~/runner
./config.sh \
    --url https://github.com/<owner>/<repo> \
    --token <TOKEN> \
    --name regression-farm-controller \
    --labels self-hosted,linux,controller \
    --work _work \
    --unattended \
    --replace
EOF
```

After this completes, refresh the GitHub *Settings → Actions → Runners* page —
you should see `regression-farm-controller` with status **Idle** and the
labels you set.

## 5. Install as a systemd service

```bash
cd /home/actions-runner/runner
./svc.sh install actions-runner
./svc.sh start

# Verify
systemctl status actions.runner.<owner>-<repo>.regression-farm-controller.service
```

The service auto-starts on boot.

## 6. Verify Docker access from the runner user

```bash
sudo -u actions-runner -H docker info | head -20
sudo -u actions-runner -H docker compose version
```

Both should succeed without `sudo`.

## 7. End-to-end smoke test

From your laptop:

```bash
gh workflow run deploy.yml --field deploy_controller=true --field deploy_workers=false
gh run watch
```

The runner should pick up the job, redeploy the controller stack, and finish
green. The Actions log will include the `[deploy-controller]` and
`[healthcheck-controller]` output produced by your scripts.

## Operations

```bash
# Check service
systemctl status actions.runner.*regression-farm-controller.service

# Tail runner logs (job-by-job output also appears here)
journalctl -u actions.runner.*regression-farm-controller.service -f

# Restart a stuck runner
systemctl restart actions.runner.*regression-farm-controller.service

# Uninstall (run as actions-runner)
cd ~/runner
./svc.sh stop
./svc.sh uninstall
./config.sh remove --token <NEW-REMOVAL-TOKEN>
```

## Security checklist

- [ ] Runner runs as `actions-runner`, **not** as root
- [ ] `actions-runner` is in the `docker` group only because deploy scripts need it
- [ ] Repo is private (or fork-PR workflows are disabled in repo settings)
- [ ] `.env.controller` is `chmod 600`, never committed
- [ ] DigitalOcean Cloud Firewall blocks port 80 except from your IP
- [ ] `WORKER_TOKEN` is not echoed in any deploy script
