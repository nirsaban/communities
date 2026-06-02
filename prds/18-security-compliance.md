# PRD 18 — Security & Compliance

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Security architecture and compliance posture across the platform. Covers data protection, access control, secrets management, vulnerability management, and legal compliance (GDPR, App Store policies).

## 2. Threat model summary

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cross-tenant data leakage | Medium | Critical | Strict middleware, integration tests |
| JWT compromise | Medium | High | Short-lived access tokens, refresh rotation |
| Stolen device | Medium | Medium | Secure storage, biometric option (Phase 2) |
| MITM | Low | High | HTTPS-only, HSTS, cert pinning (Phase 2) |
| SQL/NoSQL injection | Low | High | Input validation, parameterized queries |
| XSS / stored content attack | Medium | Medium | Sanitization on rich text inputs |
| Account takeover | Medium | High | Strong passwords, rate limiting, MFA option (Phase 2) |
| Stripe replay attacks | Low | High | Webhook signature verification |
| Insider threat (Super Admin abuse) | Low | High | Audit logs, separation of duties |
| DDoS | Low | Medium | Rate limiting, Cloudflare (Phase 2) |

## 3. Authentication security

- Passwords hashed with bcryptjs (cost factor 12)
- Login rate limit: 5 fails per 15 min per IP+email
- Account lockout after 10 fails in 1 hour (manual unlock or reset)
- Refresh token rotation (one-time-use)
- Refresh tokens stored hashed in DB
- JWT secret rotated quarterly
- All endpoints HTTPS-only (HSTS enabled)

## 4. Authorization security

- Multi-layered checks: route guard → middleware → service-layer assertion
- Default-deny: routes without explicit permission middleware return 403
- Integration tests verify cross-tenant isolation
- Sub Admin financial blocks tested explicitly

## 5. Data protection

### 5.1 At rest
- MongoDB encryption-at-rest (Atlas default; self-hosted requires LUKS volume)
- File storage (Cloudinary / S3) with encryption-at-rest enabled
- Secrets (env vars) stored in encrypted vault on VPS, not committed

### 5.2 In transit
- HTTPS everywhere (TLS 1.2 minimum)
- Stripe communication over HTTPS to api.stripe.com
- FCM communication via official SDKs (HTTPS)
- Internal Docker network is isolated; only Nginx exposed externally

### 5.3 Sensitive fields
- Passwords: never stored plaintext, never logged, never returned in API
- JWT secrets: env only
- Stripe keys: env only
- Refresh tokens: hashed in DB
- PII fields encrypted in DB? — deferred to Phase 2 (selective encryption for sensitive fields)

## 6. Input validation & sanitization

- Zod schemas on every endpoint
- Express body size limit: 10MB (1MB for non-upload)
- HTML sanitization on rich text fields (DOMPurify equivalent server-side, e.g. sanitize-html)
- File upload validation:
  - MIME type whitelist
  - Magic-byte verification (not just extension)
  - Max size per type
- express-mongo-sanitize for query/body $-prefix attacks

## 7. Secrets management

| Location | Stored secrets | Access |
|---|---|---|
| GitHub Secrets | CI/CD secrets, registry tokens, VPS SSH key | Repo admins only |
| VPS .env.production | All runtime secrets | Root + app user only, 600 perms |
| 1Password / Doppler | Master copy of all secrets | Founders + senior engineers |
| Mobile app | Public API URLs only, NO secrets | — |

Rotation schedule:
- JWT signing secret: quarterly
- Stripe API keys: yearly or on suspected leak
- Webhook secrets: yearly
- VPS SSH keys: yearly or on engineer departure

## 8. Audit logging

All sensitive actions logged to `auditLogs` collection:
- Super Admin actions (community create/suspend/delete, user disable)
- Admin actions (member role change, payment refund, financial settings change)
- Auth events (login, logout, password reset, failed login)
- Payment events (charge, refund, subscription change)

Logs retained for 1 year (TTL index), then archived to cold storage.

## 9. Vulnerability management

- `npm audit` runs in CI; fails build on high-severity issues
- Dependabot enabled for both backend and mobile
- Snyk monitoring (free tier)
- Monthly review of audit reports
- Critical CVEs patched within 7 days, high within 30

## 10. App Store compliance

### Apple App Store
- Apple Sign-In offered alongside email signup (required per guideline 4.8)
- Privacy policy URL provided
- App Tracking Transparency prompt if any tracking SDKs used
- Privacy nutrition labels accurately filled
- No external payment URLs that bypass App Store fees for digital goods within scope — handled via Stripe for physical / community-related services (allowed per guideline 3.1.5(a))
- Account deletion option (guideline 5.1.1(v))

### Google Play
- Data Safety form accurately filled
- Account deletion option
- Permissions requested only when needed
- Targets latest API level

## 11. Privacy & GDPR

### User rights supported
| Right | Implementation |
|---|---|
| Access | User can download their data via /me/export endpoint |
| Rectification | Profile editing screen |
| Erasure | Account deletion flow + 30-day grace period |
| Portability | JSON export |
| Restriction | Pause account |
| Objection | Opt out of marketing communications |

### Account deletion
- User initiates from settings
- 30-day grace period (account disabled, recoverable)
- After 30 days: soft delete user, anonymize content (replace name with "Deleted user")
- Hard delete personal data (email, phone, photo) after 30 more days
- Retain transactional records (payments) for legal/tax reasons (typically 7 years)

### Cookie / tracking notice
- N/A for mobile app (no cookies)
- If web admin dashboard added: cookie banner required

### Data Processing Agreements (DPAs)
- Sign DPAs with all sub-processors: Stripe, FCM, Cloudinary, email provider, MongoDB Atlas, Sentry

## 12. Logging & PII

- No passwords, tokens, or card data in logs
- Request logs include userId but not full request body for sensitive endpoints
- Email addresses partially redacted in non-essential logs (e.g., `j***@example.com`)
- Log retention: 90 days for application logs, 1 year for audit logs

## 13. Incident response

### Severity levels
- SEV1 — data breach, payment system down, mass account compromise
- SEV2 — partial outage, single-tenant breach, payment errors for some users
- SEV3 — feature degraded, performance regression

### Response plan
1. Detect (Sentry alert, user report, monitoring)
2. Triage and assign severity
3. Contain (revoke tokens, take systems offline if necessary)
4. Investigate (root cause via logs)
5. Communicate (status page + affected users)
6. Resolve and verify
7. Post-mortem within 7 days

### Breach notification
- GDPR: notify supervisory authority within 72 hours
- Affected users: notified without undue delay
- Process documented in `runbooks/incident-response.md`

## 14. Acceptance criteria

- All endpoints reject unauthenticated requests with 401
- Cross-tenant access is impossible via integration test
- Sub Admin → financial endpoint returns 403 (test)
- JWT secret rotation can be performed with zero downtime
- Account deletion fully wipes personal data after retention period
- Audit logs capture all required events
- npm audit passes with no high-severity issues
- Privacy policy and terms of service published and linked from app

## 15. Out of scope (v1)

- SOC 2 certification (target Phase 3 if enterprise customers)
- Multi-factor authentication for end users (Phase 2)
- Biometric authentication for app (Phase 2)
- HSM-backed key management
- WAF / Cloudflare integration (Phase 2)
