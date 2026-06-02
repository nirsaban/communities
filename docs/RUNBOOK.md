# Runbook — local dev, tests, deploy

## Prerequisites

- Node.js 20 LTS (`node -v`)
- Docker + Docker Compose v2
- Flutter SDK (latest stable) — only required for mobile work
- A Unix shell

## First-time setup

```bash
# Clone and enter the repo
cd communities

# Backend env
cp backend/.env.example backend/.env

# Generate JWT secrets (recommended — replace the placeholders in .env)
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## Run the stack with Docker

```bash
docker compose up
```

This boots:
- `api` on http://localhost:3000
- `mongo` on localhost:27017

Health check: http://localhost:3000/api/v1/health

## Run the backend without Docker

```bash
cd backend
npm install
npm run dev          # nodemon on src/server.js
npm start            # plain node
npm run lint
npm test             # jest with in-memory mongo
npm run test:watch
```

## Bootstrap a Super Admin

The first Super Admin can only be created via CLI (PRD 02 §6):

```bash
cd backend
node scripts/createSuperAdmin.js --email=admin@example.com --password=ChangeMe123
```

The script connects to the Mongo instance defined in `backend/.env`.

## Mobile dev

```bash
cd mobile
flutter pub get
flutter analyze
flutter test
flutter run                # picks the first connected device/sim
```

The API base URL is read from `mobile/.env` via `flutter_dotenv`. Default: `http://10.0.2.2:3000/api/v1` (Android emulator → host) or `http://localhost:3000/api/v1` (iOS sim). Override per build flavor in `.env.development` / `.env.staging` / `.env.production`.

## API endpoints (current)

All under `/api/v1`. Full list in PRD 13 §5.

### Health
- `GET /health`

### Auth (P1)
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET  /auth/me`
- `PATCH /auth/me`

### Super Admin (P2) — requires `globalRole=superadmin`
- `GET    /super/communities`
- `POST   /super/communities`
- `GET    /super/communities/:cid`
- `PATCH  /super/communities/:cid`
- `POST   /super/communities/:cid/suspend`
- `POST   /super/communities/:cid/restore`
- `DELETE /super/communities/:cid`

### Communities (P2) — requires membership in the target community
- `GET    /communities/:cid`
- `PATCH  /communities/:cid` (admin)
- `POST   /communities/:cid/onboard` (admin)
- `GET    /communities/:cid/members`
- `POST   /communities/:cid/members/invite`
- `PATCH  /communities/:cid/members/:uid`
- `DELETE /communities/:cid/members/:uid`
- `POST   /invitations/:token/accept`

### Events (P3) — requires membership; admin/subadmin for writes
- `GET    /communities/:cid/events`
- `POST   /communities/:cid/events`
- `GET    /events/:eid`
- `PATCH  /events/:eid`
- `POST   /events/:eid/cancel`
- `POST   /events/:eid/duplicate`
- `POST   /events/:eid/rsvp`
- `DELETE /events/:eid/rsvp`
- `GET    /events/:eid/rsvps`
- `POST   /events/:eid/managers`
- `DELETE /events/:eid/managers/:uid`
- `GET    /events/:eid/materials`
- `POST   /events/:eid/materials` (multipart)

## Tests

```bash
# Backend full suite (unit + integration)
cd backend && npm test

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch

# Mobile
cd mobile && flutter test
```

CI runs lint + test on every push (`.github/workflows/backend-ci.yml`).

## Common ops

```bash
# Tail API logs in Docker
docker compose logs -f api

# Connect to dev Mongo shell
docker compose exec mongo mongosh

# Reset dev Mongo (DESTRUCTIVE)
docker compose down -v && docker compose up

# Drop all uploads
rm -rf backend/uploads/*
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `EADDRINUSE :3000` | Another process on port 3000 | `lsof -i :3000` and kill, or change `PORT` in `.env` |
| `MongooseServerSelectionError` | Mongo not running / wrong URI | `docker compose up mongo`, check `MONGO_URI` |
| `Invalid JWT signature` after restart | Different `JWT_ACCESS_SECRET` | Use the same secret across restarts; clear tokens on the client |
| Tests hang at exit | Open Mongo handle | Run with `--detectOpenHandles` to find it |

## Deploy

Production deploy is out of scope for the current phase set (P0–P3). See PRD 16 for the future workflow: GitHub Actions → ghcr.io → SSH deploy to VPS with `docker compose pull && up -d`.
