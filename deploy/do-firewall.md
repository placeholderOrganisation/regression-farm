# DigitalOcean firewall + VPC reference

The dashboard has no app-level auth, so the firewall is your only line of defense.

## Topology assumptions

- All four droplets are placed in the **same VPC + region** (e.g. `nyc3`).
- The controller's private IP (e.g. `10.116.0.5`) is what workers point at.
- Operator IP is your laptop's public IP, written `OPS_IP` below.

## Cloud Firewall: `regression-farm-controller`

Apply to the controller droplet only.

| Direction | Type        | Protocol | Ports | Sources / Destinations           |
| --------- | ----------- | -------- | ----- | -------------------------------- |
| Inbound   | SSH         | TCP      | 22    | `OPS_IP/32`                      |
| Inbound   | Dashboard   | TCP      | 80    | `OPS_IP/32` *(no app-level auth)*|
| Inbound   | API (VPC)   | TCP      | 8000  | VPC CIDR (e.g. `10.116.0.0/20`)  |
| Outbound  | All         | All      | All   | `0.0.0.0/0`, `::/0`              |

If you need to dashboard from multiple IPs, add them to the source list rather
than opening port 80 globally.

## Cloud Firewall: `regression-farm-workers`

Apply to all worker droplets.

| Direction | Type | Protocol | Ports | Sources / Destinations |
| --------- | ---- | -------- | ----- | ---------------------- |
| Inbound   | SSH  | TCP      | 22    | `OPS_IP/32`            |
| Outbound  | All  | All      | All   | `0.0.0.0/0`, `::/0`    |

Workers initiate all traffic to the controller (over the VPC) and to Docker Hub
(public internet) — no inbound exposure required.

## Find the controller's private IP

```bash
doctl compute droplet get <controller-droplet-name> --format PrivateIPv4 --no-header
```

Use that value for `CONTROLLER_URL=http://<private-ip>:8000` on each worker's
`.env`.

## Generate the shared worker token (do once)

```bash
openssl rand -hex 32
```

Use the same value in:

- `/opt/regression-farm/src/.env` on the controller (`WORKER_TOKEN=...`)
- `/opt/regression-farm/src/.env` on each worker (`WORKER_TOKEN=...`)
