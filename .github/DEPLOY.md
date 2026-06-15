# GitHub Actions deploy

**Model:** push to `main` → GitHub Actions queues a deploy job → a
**self-hosted runner installed on the VPS** picks it up → rsyncs the checkout
into `/opt/communities` → `docker compose up -d --build` → posts a summary
with health-check results.

**Why self-hosted:** the VPS firewall blocks inbound SSH from GitHub's hosted
runner IP ranges (we hit `ssh: connect to host *** port 22: Connection timed out`).
A self-hosted runner runs **on the VPS** and talks to GitHub via outbound
HTTPS — no firewall changes needed.

## One-time setup

1. Open `https://github.com/<owner>/<repo>/settings/actions/runners/new` →
   click **Linux**. You'll see a `--token` value in the example command.
   Copy that token.

2. SSH to the VPS and run:
   ```bash
   ssh root@72.62.154.127
   cd /opt/communities
   git pull
   bash infra/install-github-runner.sh
   ```
   Paste the token when prompted.

3. What the script does:
   - Creates a non-root `actions-runner` user and adds it to the `docker` group.
   - Downloads GitHub Actions runner v2.319.1.
   - Registers it with the labels `self-hosted, linux, communities`.
   - Installs it as a systemd service that auto-starts on boot.
   - Sets ownership on `/opt/communities` so the runner can write to it.

4. Verify it's online: at
   `https://github.com/<owner>/<repo>/settings/actions/runners` you should
   see your VPS hostname with a green dot.

5. Push any commit to `main` — the queued deploy job picks up within seconds.

## Required secrets

| Name | Value | Notes |
|---|---|---|
| `DEPLOY_HOST_IP` | `72.62.154.127` | Only used in the summary table for clickable URLs |

The old `DEPLOY_HOST` and `DEPLOY_SSH_KEY` secrets are now unused — leave them
or delete via **Settings → Secrets and variables → Actions**.

## Optional manual approval gate

The deploy job runs inside the `prod` GitHub Environment. To require approval
before each push deploys:

1. **Settings → Environments → New environment → `prod`**.
2. Tick **Required reviewers** → add yourself.

Otherwise the deploy runs automatically on push.

## Failure modes

- **Job stays "queued" forever** — the self-hosted runner isn't online.
  Check `systemctl status actions.runner.*` on the VPS, or look at the
  runners page in repo settings (should show a green dot, not grey).
- **`required variable XXX is missing`** — old `.env.prod` lacks a key a new
  service requires. The workflow's "Ensure .env.prod" step now auto-appends
  missing keys from `.env.prod.example`. If the env example was updated this
  push, the next deploy will pick it up.
- **`npm error code E401` during the build** — a committed `package-lock.json`
  has a `resolved` URL pointing at a private registry the build can't auth to.
  All lockfiles must resolve from `https://registry.npmjs.org/` only. Re-run
  `npm install` on a machine whose npm registry is the public one (check with
  `npm config get registry`) and commit the regenerated lockfile.

## Rollback

```bash
ssh root@<HOST>
cd /opt/communities
git checkout <previous-sha> -- backend web infra docker-compose.prod.yml
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Or push a `revert` commit and the workflow deploys the revert.

## Reusing the runner for other repos on this VPS

If you have another project on the same VPS, you can either:
- Register a second runner via the same script — repos don't share runners by default.
- OR register an **organisation-level** runner that any repo in the org can use.
  Open `Settings → Actions → Runners → New runner` at the **org** level and follow
  the same flow.
