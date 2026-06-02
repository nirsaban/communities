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

## Payments — PayPlus

### Local credentials

PayPlus credentials live in `backend/.env`. The required vars:

| Var | Source | Notes |
|---|---|---|
| `PAYPLUS_API_KEY` | dashboard.payplus.co.il → Account → API | Used in `Authorization: <API_KEY>.<SECRET_KEY>` header |
| `PAYPLUS_SECRET_KEY` | dashboard.payplus.co.il → Account → API | — |
| `PAYPLUS_PAGE_REQUEST_UID` | dashboard → Hosted Pages → create template | Identifies the look + behaviour of the checkout page |
| `PAYPLUS_WEBHOOK_SECRET` | dashboard → Webhooks → signing secret | HMAC-SHA256 secret over the raw body |
| `PAYPLUS_API_BASE_URL` | (default) `https://restapi.payplus.co.il/api/v1.0` | — |
| `PAYPLUS_SANDBOX_MODE` | `true` in dev, `false` in production | When true, the client logs `[PAYPLUS-SANDBOX]` to stdout in lieu of calling PayPlus |
| `PAYMENT_CURRENCY` | `ILS` | Only ILS at v1 |
| `PAYMENT_MAX_INSTALLMENTS` | `12` (PayPlus תשלומים cap) | Per-event cap can be lower via `Event.pricing.maxInstallments` |
| `PLATFORM_PAYMENT_NOTIFY_URL` | e.g. `https://api.example.com/api/v1/webhooks/payplus` | Where PayPlus posts webhook events |
| `PLATFORM_PAYMENT_SUCCESS_URL` | e.g. `https://api.example.com/api/v1/payments/success` | Browser redirect target after a successful charge |
| `PLATFORM_PAYMENT_FAILURE_URL` | e.g. `https://api.example.com/api/v1/payments/failure` | Browser redirect target on failure / cancel |

In dev, leave the three credential vars blank — `PAYPLUS_SANDBOX_MODE=true` (the default) routes every outbound call to `PayPlusSandboxClient`, which logs to stdout. In production, `env.ts` hard-fails at startup if any of `PAYPLUS_API_KEY` / `PAYPLUS_SECRET_KEY` / `PAYPLUS_WEBHOOK_SECRET` is missing and sandbox isn't explicitly enabled.

### Exercising the webhook locally

The webhook is mounted at `POST /api/v1/webhooks/payplus`. To get PayPlus to reach a local API, tunnel via ngrok:

```bash
ngrok http 3000
# copy the https://<id>.ngrok.io URL
```

Then in the PayPlus dashboard set the webhook URL to `https://<id>.ngrok.io/api/v1/webhooks/payplus`. Set `PLATFORM_PAYMENT_NOTIFY_URL` in `.env` to the same value so the checkout page knows where to call back.

### Forging a webhook for tests

The handler verifies an HMAC-SHA256 hex digest over the raw body using `PAYPLUS_WEBHOOK_SECRET`. Replicate it from a shell:

```bash
SECRET=$(grep PAYPLUS_WEBHOOK_SECRET backend/.env | cut -d= -f2)
BODY='{"id":"evt_local_1","type":"payment_success","data":{"transaction_uid":"pp_tx_1","more_info":"{\"paymentId\":\"PAYMENT_OBJECT_ID\",\"communityId\":\"COMMUNITY_OBJECT_ID\",\"userId\":\"USER_OBJECT_ID\",\"eventId\":\"EVENT_OBJECT_ID\",\"kind\":\"event\"}"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')
curl -X POST http://localhost:3000/api/v1/webhooks/payplus \
  -H "Content-Type: application/json" \
  -H "x-payplus-signature: $SIG" \
  --data "$BODY"
```

A `200 { received: true, handled: true }` response means the webhook resolved a Payment row.

### Sandbox payments end-to-end (no PayPlus account required)

In sandbox mode, `POST /api/v1/events/:eid/checkout` returns a `paymentUrl` that points at our own `/payments/success` endpoint with a `ref=<paymentId>` query param. Open it in a browser; the response is a `{ status: 'pending' }` JSON envelope (the mobile poll loop reads this). To simulate the webhook landing, fire the curl recipe above with the real `paymentId`. The Payment row flips to `succeeded` and the corresponding RSVP appears as `going`.

### Issuing a refund

```bash
# Admin only — Sub Admin returns 403 (blockSubAdminFromFinancial)
curl -X POST http://localhost:3000/api/v1/payments/PAYMENT_OBJECT_ID/refund \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents":4900,"reason":"requested_by_customer"}'
```

The server calls PayPlus's refund endpoint (or logs `[PAYPLUS-SANDBOX] refund` in sandbox mode), updates `Payment.refundedAmountCents`, flips status to `partial_refund` or `refunded`, and — if the event's `refundPolicyHours` window is still open and the refund is full — cancels the RSVP and fires a `refund.received` notification.

### Stripe → PayPlus migration (one-shot)

```bash
cd backend
npm run migrate:stripe-to-payplus           # writes
npm run migrate:stripe-to-payplus -- --dry  # counts only
```

The script renames legacy Stripe fields to the gateway-agnostic ones described in `docs/DECISIONS.md`. It is idempotent — re-running on a migrated DB updates zero rows.
