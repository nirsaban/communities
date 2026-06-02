# PRD 01 — Platform Architecture

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Defines the multi-tenant SaaS architecture, system components, and how data flows between the Flutter mobile client, Express backend, MongoDB database, and supporting services.

## 2. Architecture style

- **Multi-tenant SaaS** with shared database, shared schema, tenant ID isolation
- **Layered backend:** routes → controllers → services → models
- **Stateless API:** JWT auth, no server-side sessions
- **Mobile-first:** Flutter app communicates exclusively via REST API

## 3. High-level system diagram

```
[Flutter Mobile App] ──HTTPS──▶ [Nginx reverse proxy] ──▶ [Express API]
                                                              │
                                                              ├─▶ [MongoDB]
                                                              ├─▶ [Cloudinary / S3] (media)
                                                              ├─▶ [Stripe] (payments)
                                                              └─▶ [Firebase FCM] (push)
```

## 4. Tech stack

### Mobile
| Layer | Choice |
|---|---|
| Framework | Flutter (latest stable) |
| State management | Riverpod |
| HTTP client | Dio |
| Local storage | Flutter Secure Storage, Hive |
| Navigation | go_router |
| Push notifications | Firebase Messaging |

### Backend
| Layer | Choice |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + refresh) |
| Validation | Zod |
| Logging | Winston + Morgan |
| Payments | Stripe Node SDK |
| File uploads | Multer + Cloudinary |
| Scheduling | node-cron |
| Testing | Jest + Supertest |

### Infrastructure
| Layer | Choice |
|---|---|
| Containerization | Docker + Docker Compose |
| Reverse proxy | Nginx |
| TLS | Let's Encrypt (Certbot) |
| Host | VPS (DigitalOcean / Hetzner) |
| CI/CD | GitHub Actions |
| Database hosting | MongoDB Atlas (recommended) or self-hosted Docker |
| Monitoring | Sentry, UptimeRobot |

## 5. Multi-tenant model

### Approach: shared database, tenant-scoped collections

Every community-scoped document includes a `communityId` field. All queries are scoped by `communityId` at the API layer.

```
communities          ← tenant registry
users                ← global users (can belong to multiple communities)
memberships          ← bridge: user ↔ community + role
events               ← scoped by communityId
initiatives          ← scoped by communityId
posts                ← scoped by communityId
payments             ← scoped by communityId
```

### Isolation guarantees
1. JWT contains `userId` only — never `communityId`
2. Every API request that targets community data must include `communityId` in the route or body
3. Middleware verifies the user has a valid membership in that community
4. MongoDB compound indexes on `(communityId, ...)` enforce query scoping

## 6. Environments

| Env | Purpose | Domain pattern |
|---|---|---|
| Local | Developer machine | localhost:3000 |
| Staging | QA + pilot communities | staging-api.example.com |
| Production | Public launch | api.example.com |

Each environment has its own MongoDB cluster, Stripe account (test vs live), and Firebase project.

## 7. Folder structure (backend)

```
backend/
├── src/
│   ├── config/          (env, db, stripe)
│   ├── models/          (mongoose schemas)
│   ├── controllers/     (request handlers)
│   ├── services/        (business logic)
│   ├── middleware/      (auth, role guards, validation)
│   ├── routes/          (express routers)
│   ├── utils/           (helpers, logger)
│   ├── jobs/            (cron, recurring events)
│   ├── validators/      (zod schemas)
│   └── app.js
├── tests/
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

## 8. Folder structure (mobile)

```
mobile/
├── lib/
│   ├── core/            (config, theme, constants)
│   ├── data/            (api clients, repositories)
│   ├── domain/          (models, enums)
│   ├── features/
│   │   ├── auth/
│   │   ├── communities/
│   │   ├── events/
│   │   ├── initiatives/
│   │   ├── members/
│   │   └── payments/
│   ├── shared/          (widgets, utils)
│   └── main.dart
├── assets/
├── test/
└── pubspec.yaml
```

## 9. API versioning

All routes prefixed with `/api/v1/`. Breaking changes go to `/api/v2/`. Mobile app reads API version from a `.env` constant at build time.

## 10. Non-functional requirements

| Requirement | Target |
|---|---|
| API p95 latency | <300ms |
| API uptime | 99.5% |
| Mobile cold start | <2s |
| Mobile crash-free rate | >99.5% |
| Database query p95 | <100ms |

## 11. Open questions

- Self-hosted MongoDB in Docker vs Atlas — defer to Phase 6
- CDN for media (Cloudflare in front of Cloudinary)? — likely yes
- Multi-region deployment — not needed for v1
