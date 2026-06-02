# PRD 13 — Backend API (Express)

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Node.js + Express REST API that serves the Flutter mobile app. Stateless, JWT-authenticated, multi-tenant via MongoDB.

## 2. API design principles

- RESTful, resource-oriented routes
- JSON request/response only
- Versioned: `/api/v1/...`
- Standard HTTP status codes
- Cursor-based pagination for lists
- Consistent error response shape
- ISO 8601 timestamps everywhere
- Snake-free: all JSON keys use camelCase

## 3. Standard response shapes

### Success
```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "nextCursor": "..." }
}
```

### Error
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email is required",
    "details": [{ "field": "email", "issue": "required" }]
  }
}
```

### Error codes (subset)
- `UNAUTHENTICATED` — no/invalid token
- `UNAUTHORIZED` — token valid but lacks permission
- `INVALID_INPUT` — validation failed
- `NOT_FOUND` — resource not found
- `CONFLICT` — duplicate or state conflict
- `RATE_LIMITED` — too many requests
- `INTERNAL_ERROR` — server error

## 4. Folder structure

```
backend/
├── src/
│   ├── app.js                    (express app, middleware wiring)
│   ├── server.js                 (http server bootstrap)
│   ├── config/
│   │   ├── env.js                (env loading + validation)
│   │   ├── db.js                 (mongoose connection)
│   │   ├── stripe.js             (stripe client)
│   │   └── logger.js             (winston)
│   ├── models/
│   │   ├── User.js
│   │   ├── Community.js
│   │   ├── Membership.js
│   │   ├── Event.js
│   │   ├── EventRSVP.js
│   │   ├── Initiative.js
│   │   ├── Payment.js
│   │   ├── Subscription.js
│   │   ├── Post.js
│   │   ├── Comment.js
│   │   ├── Notification.js
│   │   └── AuditLog.js
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── role.js
│   │   ├── validate.js
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── super.routes.js
│   │   ├── community.routes.js
│   │   ├── event.routes.js
│   │   ├── initiative.routes.js
│   │   ├── payment.routes.js
│   │   ├── webhook.routes.js
│   │   └── me.routes.js
│   ├── validators/
│   ├── jobs/
│   │   ├── recurringEvents.job.js
│   │   ├── eventReminders.job.js
│   │   └── waitlistPromotion.job.js
│   ├── utils/
│   └── tests/
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 5. Complete endpoint list (v1)

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
PATCH  /api/v1/auth/me
```

### Super Admin
```
GET    /api/v1/super/dashboard
GET    /api/v1/super/communities
POST   /api/v1/super/communities
GET    /api/v1/super/communities/:cid
PATCH  /api/v1/super/communities/:cid
POST   /api/v1/super/communities/:cid/suspend
POST   /api/v1/super/communities/:cid/restore
DELETE /api/v1/super/communities/:cid
GET    /api/v1/super/users
GET    /api/v1/super/users/:uid
POST   /api/v1/super/users/:uid/disable
POST   /api/v1/super/users/:uid/promote
```

### Communities (admin/sub admin scope)
```
GET    /api/v1/communities/:cid
PATCH  /api/v1/communities/:cid
POST   /api/v1/communities/:cid/onboard
GET    /api/v1/communities/:cid/dashboard
GET    /api/v1/communities/:cid/analytics
GET    /api/v1/communities/:cid/finances             (admin only)
GET    /api/v1/communities/:cid/members
POST   /api/v1/communities/:cid/members/invite
PATCH  /api/v1/communities/:cid/members/:uid
DELETE /api/v1/communities/:cid/members/:uid
POST   /api/v1/communities/:cid/applications/:aid/approve
POST   /api/v1/communities/:cid/applications/:aid/reject
```

### Events
```
GET    /api/v1/communities/:cid/events
POST   /api/v1/communities/:cid/events
GET    /api/v1/events/:eid
PATCH  /api/v1/events/:eid
POST   /api/v1/events/:eid/cancel
POST   /api/v1/events/:eid/duplicate
GET    /api/v1/events/:eid/rsvps
POST   /api/v1/events/:eid/rsvp
DELETE /api/v1/events/:eid/rsvp
POST   /api/v1/events/:eid/managers
DELETE /api/v1/events/:eid/managers/:uid
GET    /api/v1/events/:eid/materials
POST   /api/v1/events/:eid/materials
GET    /api/v1/events/:eid/qa
POST   /api/v1/events/:eid/qa
POST   /api/v1/events/:eid/broadcast
POST   /api/v1/events/:eid/summary
POST   /api/v1/events/:eid/attendance
```

### Initiatives
```
GET    /api/v1/communities/:cid/initiatives
POST   /api/v1/communities/:cid/initiatives
GET    /api/v1/initiatives/:iid
PATCH  /api/v1/initiatives/:iid
DELETE /api/v1/initiatives/:iid
POST   /api/v1/initiatives/:iid/submit
POST   /api/v1/initiatives/:iid/approve
POST   /api/v1/initiatives/:iid/reject
POST   /api/v1/initiatives/:iid/support
DELETE /api/v1/initiatives/:iid/support
POST   /api/v1/initiatives/:iid/contributors
GET    /api/v1/initiatives/:iid/comments
POST   /api/v1/initiatives/:iid/comments
POST   /api/v1/initiatives/:iid/updates
POST   /api/v1/initiatives/:iid/complete
```

### Payments
```
POST   /api/v1/events/:eid/checkout
POST   /api/v1/communities/:cid/subscribe
GET    /api/v1/me/subscriptions
POST   /api/v1/me/subscriptions/:sid/cancel
GET    /api/v1/events/:eid/payments                  (admin only)
POST   /api/v1/payments/:pid/refund                  (admin only)
POST   /api/v1/webhooks/stripe
```

### Me (user-scoped)
```
GET    /api/v1/me/feed
GET    /api/v1/me/rsvps
GET    /api/v1/me/notifications
PATCH  /api/v1/me/notifications/:nid/read
GET    /api/v1/me/managed-events
GET    /api/v1/me/communities
POST   /api/v1/me/devices                            (register FCM token)
DELETE /api/v1/me/devices/:did
```

## 6. Middleware chain (typical request)

```
request
  → cors
  → helmet
  → morgan (logging)
  → bodyParser
  → rateLimiter (global)
  → verifyToken
  → loadMembership (for community-scoped routes)
  → requireRole (per route)
  → validateInput (zod)
  → controller
  → errorHandler
```

## 7. Pagination

Cursor-based for all lists:
```
GET /api/v1/communities/:cid/events?limit=20&cursor=<base64>
```

Response includes `meta.nextCursor` (null if last page).

## 8. Filtering and sorting

Query parameters:
- `?status=active,completed`
- `?category=lecture`
- `?sort=startAt:asc`
- `?search=workshop`

Validated and parsed centrally.

## 9. Background jobs (node-cron)

| Job | Frequency | Purpose |
|---|---|---|
| Materialize recurring events | Daily 3am | Generate next 60 days of instances |
| Event reminders | Every 5 min | Send 24h/1h/10min reminders |
| Waitlist promotion | Every 1 min | Promote when seats open |
| Subscription status sync | Daily 4am | Re-sync with Stripe |
| Audit log archival | Weekly | Move old logs to cold storage |
| Cleanup soft-deleted communities | Daily 5am | Hard delete after 30 days |

## 10. Logging

- Winston with multiple transports (console + file + Sentry)
- Request log: method, path, status, duration, userId
- Sensitive fields (passwords, tokens) never logged
- Error logs always include stack + request context

## 11. Rate limiting

| Endpoint group | Limit |
|---|---|
| Auth (login, register, forgot) | 10 req / 15 min / IP |
| Webhooks | unlimited (signed) |
| Read APIs | 200 req / min / user |
| Write APIs | 60 req / min / user |
| File uploads | 20 req / hour / user |

## 12. CORS

- Allowed origins set via env var (mobile + admin dashboard if added later)
- Mobile app uses no Origin header so CORS is permissive for native calls

## 13. Security

- helmet for security headers
- express-mongo-sanitize for NoSQL injection protection
- Body size limit: 10MB (smaller for non-upload routes)
- Webhook signature verification
- Secrets in env vars, never committed

## 14. Acceptance criteria

- All endpoints return correct status codes
- Response shapes match spec
- Auth middleware blocks unauthenticated requests
- Role middleware blocks unauthorized requests
- Pagination works consistently across all lists
- Background jobs run on schedule
- Errors return standard error shape

## 15. Out of scope (v1)

- GraphQL endpoint
- WebSocket / real-time channels (push notifications cover most needs)
- API rate limiting per community plan tier
- Public API for third-party developers
