# Production deploy — single-VPS

Stack: 1 host, Docker Compose, **API** (Node + Express, port 3010) + **Web**
(React PWA served by nginx, port 3011) + **Mongo** (internal only).

No CI yet; deploys are push-from-your-laptop via `infra/deploy.sh`.

## Architecture

```
Internet
   │
   ▼
external nginx on :80/:443  ── reverse-proxy:
                                /          → http://localhost:3011   (web container)
                                /api/v1/*  → http://localhost:3010   (api container, optional)
                                              OR just point everything at :3011 —
                                              the web container's built-in nginx
                                              already proxies /api/v1 → api internally.
   ▼
docker network "internal":
   ┌─────────┐    ┌──────┐    ┌───────┐
   │ web:80  │ ─→ │ api  │ ─→ │ mongo │
   │ (nginx) │    │ 4242 │    │ 27017 │
   └─────────┘    └──────┘    └───────┘
```

The web container ships its own nginx (`web/nginx.conf`) that serves the SPA
**and** proxies `/api/v1/*` to the api over the internal docker network. The
simplest public setup is: one external nginx server block → `localhost:3011`.
Both the SPA and the API are reachable from a single upstream.

## Files

| Path | Purpose |
|---|---|
| `docker-compose.yml` | Dev compose (mongo + api + web). Exposes :4242 (api) + :5174 (web) for local. |
| `docker-compose.prod.yml` | Prod compose (mongo internal, api on host :3010, web on host :3011). |
| `web/Dockerfile` | Multi-stage Vite build → static dist served by nginx. |
| `web/nginx.conf` | Web container's nginx — SPA fallback + `/api/v1/*` proxy to the api service. |
| `backend/Dockerfile` | Multi-stage Node build → `node dist/server.js`. |
| `infra/nginx/communities.conf` | Optional reverse-proxy template if you want to expose api on a separate domain. |
| `infra/.env.prod.example` | Production env template. Copy to `.env.prod` on the host and fill in real values. |
| `infra/deploy.sh` | One-shot rsync + rebuild + restart from your laptop. |

## First deploy

1. **Get SSH key auth working.** From your laptop:
   ```
   cat ~/.ssh/id_ed25519.pub | ssh root@<HOST> 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
   ```
   Confirm: `ssh -o BatchMode=yes root@<HOST> 'echo ok'`.

2. **First-time host bootstrap** (installs Docker if absent, rsyncs repo, creates `.env.prod` with fresh JWT secrets):
   ```
   ./infra/deploy.sh root@<HOST> --first-time
   ```

3. **Edit `.env.prod` on the host** to set real values (Stripe keys, etc.):
   ```
   ssh root@<HOST>
   cd /opt/communities
   vim .env.prod
   ```
   Then redeploy:
   ```
   ./infra/deploy.sh root@<HOST>
   ```

4. **Smoke test** (the deploy script does these automatically, but verify in your browser too):
   ```
   curl http://<HOST>:3010/api/v1/health    # api direct
   curl http://<HOST>:3011/healthz          # web container
   curl http://<HOST>:3011/api/v1/health    # web → api proxy
   open http://<HOST>:3011/                 # the actual app
   ```
   Expect `{"data":{"status":"ok","db":"ok",...}}` on the API call and the SPA to load on the web URL.

## Attaching a domain

Once a DNS A record points at the VPS, the simplest is to front everything
through the existing nginx that owns 80/443. Add **one** server block:

```nginx
server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;
    ssl_certificate     /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass         http://127.0.0.1:3011;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection        "";
    }
}
```

That one upstream serves the SPA *and* the API (because the web container's
internal nginx proxies `/api/v1/*` to the api over the docker network).

Then update `.env.prod`:
```
API_BASE_URL=https://app.yourdomain.com
WEB_BASE_URL=https://app.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com
```
and redeploy.

### TLS via certbot

```bash
ssh root@<HOST>
certbot certonly --nginx -d app.yourdomain.com \
  --email you@yourdomain.com --agree-tos --no-eff-email
```

Cert renewal (twice per year): `certbot renew` + reload nginx. Wrap in cron once proven.

## Updating

Code change → `./infra/deploy.sh root@<HOST>`. The script rsyncs the working
tree (uncommitted changes go up; tighten this into a CI build later).

## Pointing the mobile app at this backend

Edit `mobile/.env.production`:
```
API_BASE_URL=https://app.yourdomain.com/api/v1
```
…then rebuild the APK and install on the device.

## Rolling back

```
ssh root@<HOST>
cd /opt/communities
git checkout <previous-sha> -- backend web mobile docker-compose.prod.yml infra
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

(Once we have tagged releases, this becomes `git checkout v1.2.3`.)

## What's intentionally NOT included yet

- CI/CD (GitHub Actions running tests + auto-deploy on tag)
- Mongo backups (current state: relies on VPS provider snapshots only)
- Log aggregation (currently `docker compose logs api` / `web`)
- Real mail provider (MAIL_DRIVER=console — emails print to logs, don't send)
- Object storage (STORAGE_DRIVER=local — uploads live in a volume, not Cloudinary/S3)
- Sentry / monitoring
- Real payment gateway (Stripe stub for now)

Each of these is a separate follow-up task. None block the smoke-test deploy.
