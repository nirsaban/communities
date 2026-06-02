# Community Management SaaS

Multi-tenant mobile SaaS for community management — events, members, payments, initiatives — built as a Flutter app talking to an Express + MongoDB backend.

The complete product specification lives in [`prds/`](prds/) (21 PRD files + index). Treat them as the source of truth.

## Stack

| Layer | Choice |
|---|---|
| Mobile | Flutter (latest stable) + Riverpod + Dio + go_router + flutter_secure_storage + Hive |
| Backend | Node.js 20 LTS + Express + Mongoose + Zod + Winston + bcryptjs + jsonwebtoken |
| Database | MongoDB (Atlas-compatible; local Docker for dev) |
| Containers | Docker + docker-compose |
| Tests | Jest + Supertest (backend), flutter_test (mobile) |
| Lint/format | ESLint + Prettier (backend), `flutter analyze` + `dart format` (mobile) |
| CI | GitHub Actions |

## Repo layout

```
/
├── backend/                 Express API
├── mobile/                  Flutter app
├── infra/                   docker-compose, nginx, scripts
├── prds/                    Product requirements (do not modify)
├── docs/                    DECISIONS, RUNBOOK, PROGRESS
├── .github/workflows/       CI pipelines
├── docker-compose.yml       Top-level dev stack
└── README.md
```

## Run locally

```bash
# 1. Copy env template
cp backend/.env.example backend/.env

# 2. Boot the stack (Mongo + API)
docker compose up

# API:    http://localhost:3000/api/v1/health
# Mongo:  mongodb://localhost:27017
```

To run the backend without Docker:

```bash
cd backend
npm install
npm run dev
```

## Run tests

```bash
# Backend
cd backend
npm test
npm run lint

# Mobile
cd mobile
flutter test
flutter analyze
```

## Bootstrap a Super Admin

```bash
cd backend
node scripts/createSuperAdmin.js --email=admin@example.com --password=ChangeMe123
```

## Phase status

See [docs/PROGRESS.md](docs/PROGRESS.md). The current implementation covers phases **P0–P3** of [`prds/20-roadmap-milestones.md`](prds/20-roadmap-milestones.md) plus a Flutter auth scaffold.

## Documentation

- [PRD index](prds/README.md)
- [docs/DECISIONS.md](docs/DECISIONS.md) — non-trivial architectural choices
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — local dev, tests, deploy
- [docs/PROGRESS.md](docs/PROGRESS.md) — what's built, what's next
