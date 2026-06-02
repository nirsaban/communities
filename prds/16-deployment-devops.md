# PRD 16 — Deployment & DevOps

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

How the system is built, packaged, deployed, and monitored. Covers Docker containerization, VPS hosting, CI/CD via GitHub Actions, and operational practices.

## 2. Environments

| Env | Purpose | Backend URL | Mobile config |
|---|---|---|---|
| Local | Dev machine | http://localhost:3000 | Dev flavor |
| Staging | QA, pilot communities | https://staging-api.example.com | Staging flavor |
| Production | Public launch | https://api.example.com | Production flavor |

Each environment has its own:
- MongoDB cluster
- Stripe account (test / live)
- Firebase project (for FCM)
- Domain + SSL cert
- Environment variables

## 3. Container architecture

```
[VPS host]
  └── docker-compose
        ├── nginx       (ports 80, 443)
        ├── api         (Express, port 3000 internal)
        ├── mongo       (optional; if not using Atlas)
        ├── certbot     (renewal sidecar)
        └── (jobs)      (separate container running cron tasks if scaled out)
```

### 3.1 API Dockerfile (multi-stage)

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
```

### 3.2 docker-compose.yml (production)

```yaml
version: '3.9'
services:
  api:
    image: ghcr.io/yourorg/community-api:${TAG}
    env_file: .env.production
    restart: always
    depends_on: [mongo]
    networks: [internal]

  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    restart: always
    networks: [internal]

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - certs:/etc/letsencrypt
    depends_on: [api]
    networks: [internal]

  certbot:
    image: certbot/certbot
    volumes:
      - certs:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew --quiet; sleep 12h; done'"

networks:
  internal: {}

volumes:
  mongo_data:
  certs:
```

## 4. Nginx config (essentials)

- Listen on 80 → redirect to HTTPS
- Listen on 443 with TLS via Let's Encrypt
- Proxy to api:3000
- Gzip enabled
- Client max body size: 100MB (for uploads)
- Security headers via Nginx (in addition to helmet on Express)

## 5. VPS setup

### 5.1 Provider options
- DigitalOcean (recommended for ease)
- Hetzner (cheaper, strong EU presence)
- Linode
- Vultr

Initial spec: 2 vCPU, 4 GB RAM, 80 GB SSD, Ubuntu 22.04 LTS. Scale up as needed.

### 5.2 Initial provisioning

```
1. Create VPS instance with Ubuntu 22.04
2. SSH in, create non-root user with sudo
3. Disable root SSH login
4. Enable UFW: allow 22, 80, 443 only
5. Install Docker + Docker Compose
6. Install fail2ban
7. Configure SSH key-only auth
8. Set hostname + timezone
9. Run unattended-upgrades for security patches
```

Script this with Ansible or a single bash setup script committed to repo.

## 6. SSL / TLS

- Let's Encrypt via Certbot (free)
- Auto-renewal every 12h via certbot container
- Certs mounted into Nginx via shared volume
- Initial cert obtained on first deploy with `certonly --standalone` (Nginx briefly down) or via Nginx plugin

## 7. CI/CD with GitHub Actions

### 7.1 Workflows

`.github/workflows/`
- `backend-ci.yml` — on PR: lint, test, type-check
- `backend-deploy.yml` — on push to main: build image, push to ghcr.io, deploy to VPS
- `mobile-ci.yml` — on PR: flutter analyze, flutter test
- `mobile-build.yml` — on tag: build iOS + Android, upload to TestFlight + Play Internal

### 7.2 Backend deploy workflow

```yaml
name: Deploy backend
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ghcr.io/yourorg/community-api:latest
            ghcr.io/yourorg/community-api:${{ github.sha }}
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/community
            export TAG=${{ github.sha }}
            docker compose pull api
            docker compose up -d api
            docker image prune -f
```

### 7.3 Secrets management

GitHub repo secrets:
- VPS_HOST, VPS_USER, VPS_SSH_KEY
- DOCKER_REGISTRY_TOKEN

On VPS, .env.production stores:
- MongoDB URI
- JWT secrets
- Stripe API keys
- Stripe webhook secret
- Cloudinary credentials
- FCM service account JSON path
- SendGrid API key

Never committed to repo. Backed up securely (1Password / Doppler).

## 8. Mobile deployment

### 8.1 iOS (TestFlight → App Store)
- Apple Developer account ($99/year)
- Xcode signing certificates and provisioning profiles in repo (or fastlane match)
- fastlane lane for build + upload to TestFlight
- GitHub Actions runs on macOS runner for CI builds
- Manual submission to App Store after TestFlight validation

### 8.2 Android (Internal → Production)
- Google Play Developer account ($25 one-time)
- Signing key stored as GitHub secret (base64)
- fastlane lane for build + upload to Play Internal track
- Manual promotion: Internal → Closed Testing → Production

### 8.3 Versioning
- Semver: `1.0.0+1` (Flutter convention: version+build)
- Tag releases in git: `v1.0.0`
- CHANGELOG.md updated per release

## 9. Database operations

### Backups
- MongoDB Atlas: automatic daily snapshots
- Self-hosted: `mongodump` cron + S3 upload

### Migrations
- Run as part of deploy pipeline:
  ```
  docker compose run --rm api npm run migrate:up
  ```
- Always backward-compatible to enable rolling deploys

## 10. Monitoring & alerting

### Metrics & logs
- Application logs → Winston → stdout → Docker logs → optional Loki / Papertrail
- Sentry for exception tracking (backend + mobile)
- UptimeRobot for /health endpoint monitoring (5-min checks)
- MongoDB Atlas built-in metrics

### Health check endpoint
```
GET /api/v1/health
  → 200 { status: 'ok', db: 'ok', uptime: ..., version: ... }
```

### Alerts
- Sentry → Slack on new errors
- UptimeRobot → email + SMS on downtime
- Stripe → email on payment failures

## 11. Rollback strategy

- Docker images tagged with commit SHA
- On bad deploy: `docker compose up api` with previous tag
- Database migrations must be backward-compatible; if not, restore from backup
- Mobile rollback: not possible directly (App Store) — push hotfix as new version

## 12. Scaling roadmap

| Stage | Indicator | Action |
|---|---|---|
| 1 | < 1k MAU | Single VPS, MongoDB Atlas free tier |
| 2 | 1k–10k MAU | Larger VPS, MongoDB M10 cluster |
| 3 | 10k–50k MAU | Load balancer + 2 API containers, M20 cluster |
| 4 | 50k+ MAU | Kubernetes, sharded MongoDB, CDN, multi-region |

## 13. Cost estimates (early stage)

| Item | Monthly cost |
|---|---|
| VPS (2vCPU/4GB) | $20–40 |
| MongoDB Atlas (M0 free → M10 $60) | $0–60 |
| Cloudinary (free → $99) | $0–99 |
| Sentry (free → $26) | $0–26 |
| Domain + email | $5 |
| Apple Developer | $8 (amortized) |
| Google Play Developer | $2 (amortized) |
| **Total** | **$35–240** |

## 14. Acceptance criteria

- Pushing to `main` triggers backend deploy within 10 minutes
- Health endpoint returns 200 consistently
- SSL cert auto-renews (verified by Let's Encrypt staging test)
- Backups are taken daily and restorable
- Sentry receives errors from both backend and mobile
- A bad commit can be rolled back in under 5 minutes

## 15. Out of scope (v1)

- Multi-region deployment
- Auto-scaling based on load
- Blue/green deploys with traffic shifting
- Kubernetes orchestration
- Service mesh
