# Claude Code Kickoff Prompt — Community Management SaaS

> Paste everything below this line into Claude Code as your first message. Do not edit it.

---

You are the lead engineer building a multi-tenant Community Management SaaS mobile app. The complete specification lives in `prds/` — 21 PRD files plus a README. **Read every file in `prds/` before writing any code.** They are your source of truth and supersede any assumptions.

## Your mission

Execute Phases P0 through P3 from `prds/20-roadmap-milestones.md` in a single autonomous session. That is roughly 25% of the full v1 scope. Do NOT ask questions. Make decisions and proceed. If a decision is genuinely ambiguous, pick the option most consistent with the PRDs, log the choice in `DECISIONS.md`, and continue.

## Non-negotiable stack

- Mobile: Flutter (latest stable) + Riverpod + Dio + go_router + flutter_secure_storage + Hive
- Backend: Node.js 20 LTS + Express + Mongoose + Zod + Winston + bcryptjs + jsonwebtoken
- DB: MongoDB (local Docker for dev; Atlas-compatible connection string)
- Containers: Docker + docker-compose
- Tests: Jest + Supertest (backend), flutter_test (mobile)
- Lint/format: ESLint + Prettier (backend), `flutter analyze` + dart format (mobile)
- CI: GitHub Actions

If anything else is needed, choose the most popular, maintained library and proceed.

## Repository layout (create this)

```
/
├── backend/                  Express API
├── mobile/                   Flutter app
├── infra/                    docker-compose, nginx.conf, scripts
├── prds/                     (already present — do not modify)
├── docs/
│   ├── DECISIONS.md          log every non-trivial choice here
│   └── RUNBOOK.md            how to run locally, run tests, deploy
├── .github/workflows/        CI pipelines
├── .gitignore
├── README.md
└── KICKOFF_PROMPT.md         (this file)
```

## Execution order — do these phases in sequence, no skipping

### P0 — Foundations
1. Create the repo layout above.
2. Add comprehensive `.gitignore` for Node + Flutter + macOS/Windows + IDE files.
3. Write a root `README.md` that explains: what this is, the stack, how to run dev (one command: `docker compose up`), how to run tests, link to `prds/README.md`.
4. Initialize `docs/DECISIONS.md` with one entry per stack choice and the rationale (pull from PRD 01).
5. Initialize `docs/RUNBOOK.md` with the local dev workflow.

### P1 — Backend skeleton + auth (full)
Implement everything in `prds/02-auth-authorization.md` and the relevant sections of PRDs 01, 13, 14.

Concrete deliverables:
- `backend/` with the folder structure from PRD 13 §4
- `package.json` with all required dependencies and scripts: `dev`, `start`, `test`, `lint`, `migrate:up`
- `src/config/env.js` — env loading + Zod validation (fail fast on missing vars)
- `src/config/db.js` — Mongoose connection with retry
- `src/config/logger.js` — Winston with JSON output
- Models: `User`, `RefreshToken`, `AuditLog` (full schemas per PRD 14)
- Middleware: `verifyToken`, `validate(schema)`, `rateLimiter`, `errorHandler`
- Routes implemented under `/api/v1/auth/`:
  - `POST /register`
  - `POST /login`
  - `POST /refresh` (with refresh-token rotation per PRD 02)
  - `POST /logout`
  - `POST /forgot-password` (stub email sending behind a `MailService` interface — log to console in dev)
  - `POST /reset-password`
  - `GET /me`
  - `PATCH /me`
- `GET /api/v1/health` returning `{status, db, uptime, version}`
- Standard error response shape from PRD 13 §3
- `.env.example` listing every variable with a sample value
- `Dockerfile` (multi-stage per PRD 16 §3.1)
- `docker-compose.yml` at repo root (or `infra/docker-compose.yml`) running `api` + `mongo`
- `scripts/createSuperAdmin.js` CLI per PRD 02 §6
- Jest setup with `mongodb-memory-server`
- Unit + integration tests covering: register, login, refresh rotation, logout, role-based access, rate limit triggers, password reset flow
- Coverage threshold ≥ 70% on touched code
- GitHub Actions workflow `.github/workflows/backend-ci.yml`: install → lint → test on every push

JWT specifics:
- Access token: 15 min, payload `{userId, globalRole}`
- Refresh token: 30 days, stored hashed, one-time-use rotation per PRD 02

### P2 — Multi-tenant + roles
Implement everything in PRDs 03, 04, 05, and relevant parts of 02 and 14.

Concrete deliverables:
- Models: `Community`, `Membership`, `Invitation`, `Application` (full schemas from PRD 14)
- Middleware: `loadMembership`, `requireGlobalRole`, `requireCommunityRole`, `blockSubAdminFromFinancial`
- Routes:
  - `POST /api/v1/super/communities` (create community + initial admin invitation)
  - `GET /api/v1/super/communities` (list with pagination)
  - `GET /api/v1/super/communities/:cid`
  - `PATCH /api/v1/super/communities/:cid`
  - `POST /api/v1/super/communities/:cid/suspend`
  - `POST /api/v1/super/communities/:cid/restore`
  - `DELETE /api/v1/super/communities/:cid` (soft delete)
  - `GET /api/v1/communities/:cid` (members can view their community)
  - `PATCH /api/v1/communities/:cid` (admin only)
  - `POST /api/v1/communities/:cid/onboard` (community wizard submission)
  - `GET /api/v1/communities/:cid/members`
  - `POST /api/v1/communities/:cid/members/invite`
  - `PATCH /api/v1/communities/:cid/members/:uid` (role change)
  - `DELETE /api/v1/communities/:cid/members/:uid`
  - `POST /api/v1/invitations/:token/accept`
- Audit logging on every write under `/super/*` and on role changes
- Integration tests proving cross-tenant isolation (User in Community A cannot read/write Community B)
- Integration test proving Sub Admin gets 403 on any `/finances/*` or paid-event-create call (the route can be a placeholder for now — the middleware must be wired)
- Cursor-based pagination utility used on all list endpoints

### P3 — Events MVP (one-time events only; recurring deferred to a later session)
Implement PRDs 06, 07, 08 (one-time portions only) plus relevant parts of 14.

Concrete deliverables:
- Models: `Event` (one-time only fields populated; recurring fields present but unused), `EventRSVP`, `Material`
- Routes:
  - `POST /api/v1/communities/:cid/events` (admin/sub admin only; reject if `pricing.priceCents > 0` from sub admin)
  - `GET /api/v1/communities/:cid/events` (filter by status, date range, paginated)
  - `GET /api/v1/events/:eid`
  - `PATCH /api/v1/events/:eid` (admin/sub admin)
  - `POST /api/v1/events/:eid/cancel`
  - `POST /api/v1/events/:eid/duplicate`
  - `POST /api/v1/events/:eid/rsvp` (member; free events only in this phase)
  - `DELETE /api/v1/events/:eid/rsvp`
  - `GET /api/v1/events/:eid/rsvps` (admin/sub admin/event manager)
  - `POST /api/v1/events/:eid/managers` / `DELETE /api/v1/events/:eid/managers/:uid`
  - `GET /api/v1/events/:eid/materials`
  - `POST /api/v1/events/:eid/materials` (event manager; multipart upload — accept the file, store in `/uploads/` locally for now behind a `StorageService` interface)
- `requireEventManager` middleware
- Capacity + waitlist logic (PRD 08 §5)
- Integration tests covering: create event, RSVP, capacity-reached → waitlist, cancel event → all RSVPs notified (notification stub OK), event manager scope enforcement
- Materials upload returns a URL; storage interface allows swapping Cloudinary later without touching controllers

### Mobile (start in parallel during P1)
- Initialize Flutter project in `mobile/`
- Configure Riverpod, Dio, go_router, flutter_secure_storage, Hive
- Folder structure per PRD 12 §3
- Theme + light/dark mode setup
- Screens: splash, login, register, forgot-password, reset-password, basic home (placeholder)
- AuthRepository + AuthNotifier (Riverpod) hitting the real backend
- Dio interceptor for token attachment + 401 refresh per PRD 02 §5.2
- Route guards via go_router redirect
- `flutter_dotenv` for `API_BASE_URL` per build flavor
- `flutter analyze` clean, `flutter test` passes with at least: AuthNotifier test, login form validation test

## Operating rules

1. **No questions.** When you'd otherwise stop to ask, decide and proceed. Log the decision in `docs/DECISIONS.md`.
2. **Commit often** with conventional commit messages (`feat:`, `fix:`, `chore:`, `test:`, `docs:`). One logical change per commit.
3. **Tests are not optional.** Every new route ships with at least one happy-path and one failure-path test.
4. **Defaults to apply silently:**
   - JWT access secret + refresh secret: generate random hex in `.env.example` instructions and require both
   - Default port: backend 3000, MongoDB 27017
   - Default currency: USD
   - Default timezone: UTC server-side, format on client
   - File uploads in dev: store under `backend/uploads/` (gitignored)
   - Email in dev: log to console with a `[mail]` prefix
5. **Definition of done for each phase:**
   - All listed routes implemented + tested
   - `npm test` green
   - `npm run lint` green
   - `docker compose up` boots the stack with no errors
   - The phase's section in `docs/RUNBOOK.md` updated with any new commands or endpoints
6. **At the end of each phase**, write a short summary to `docs/PROGRESS.md` (create it) with: what was built, test coverage delta, any deviations from the PRD with reasoning, what's next.

## When you finish (or run out of context)

Write a final summary to `docs/PROGRESS.md` listing:
- Phases completed in full
- Any partial work and exactly where it stopped (file paths + TODOs in code)
- Commands needed to verify (`npm test`, `docker compose up`, `flutter test`)
- The next prompt I should send to resume

## Start now

Begin by reading `prds/README.md` and `prds/20-roadmap-milestones.md`. Then read the rest of `prds/` in numerical order. Then execute P0. Do not write a plan summary back to me before starting — just start.
