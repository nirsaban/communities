# GitHub Actions deploy

Push to `main` → CI runs → deploy job rsyncs the repo to the VPS and
`docker compose up -d --build`s the stack. Manual re-deploy via the **Actions
→ deploy → Run workflow** button.

## Required secrets

Set under **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value | Example |
|---|---|---|
| `DEPLOY_HOST` | SSH target with user prefix | `root@72.62.154.127` |
| `DEPLOY_HOST_IP` | Bare host (for the post-deploy smoke test) | `72.62.154.127` |
| `DEPLOY_SSH_KEY` | The **private** SSH key, exactly as in `~/.ssh/id_ed25519` (or whatever) | `-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n` |

### Minting a deploy-only SSH key (recommended)

Don't reuse your personal key. From your laptop:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/communities_deploy -N '' -C 'github-actions-deploy'
# Copy the public key to the server
ssh-copy-id -i ~/.ssh/communities_deploy.pub root@72.62.154.127
# Print the PRIVATE key and paste it into the DEPLOY_SSH_KEY secret
cat ~/.ssh/communities_deploy
```

If you want to be stricter, restrict the deploy key on the server by editing
`~/.ssh/authorized_keys` and prepending:
```
command="cd /opt/communities && /bin/bash",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA…
```
…but the simpler unrestricted key is fine for staging.

## Optional gating (manual approval before prod)

The deploy job runs inside the `prod` GitHub Environment. To require approval
before each prod deploy:

1. **Settings → Environments → New environment → `prod`**.
2. Tick **Required reviewers** → add yourself.
3. Push to main → the deploy job pauses; you'll get a notification to approve.

If you don't want gating, remove the `environment:` block from
`.github/workflows/deploy.yml`.

## What the deploy job does

1. Checks out the commit being deployed.
2. Loads `DEPLOY_SSH_KEY` into an ssh-agent on the runner.
3. Trusts the host via `ssh-keyscan` (no manual fingerprint confirm).
4. Installs `rsync` on the runner (Ubuntu).
5. Runs `./infra/deploy.sh "$DEPLOY_HOST"` — same script you run locally.
6. Smoke-tests `/healthz` and the `/api/v1/health` proxy through nginx.

## Failure modes

- **`DEPLOY_HOST not set`** — you forgot to add the secret. Set the three above.
- **`Host key verification failed`** — the host IP changed or the server was reprovisioned. Delete the `~/.ssh/known_hosts` entry in the workflow or just re-run; the keyscan step regenerates.
- **`required variable WEB_BASE_URL is missing`** — old `.env.prod` on the host doesn't have a new key. The deploy script now auto-appends missing keys from `infra/.env.prod.example`, but you can manually `ssh root@<HOST> "vim /opt/communities/.env.prod"` to inspect.
- **Build fails on web/lockfile** — the web Dockerfile already ignores the local lockfile and re-resolves against the public npm registry. If you see auth errors mentioning `paybox.jfrog.io`, the Dockerfile change didn't ship — re-pull.

## Rollback

```bash
ssh root@<HOST>
cd /opt/communities
git checkout <previous-sha> -- backend web infra docker-compose.prod.yml
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Or push a `revert` commit and let GitHub Actions deploy that revert.
