# Implementation Progress

Live record of what's been built, deviations from the PRDs, and what's next.

---

## Phases complete

### P0 — Foundations ✅
### P1 — Backend skeleton + auth ✅ (TypeScript)
### P2 — Multi-tenant + roles ✅
### P3 — Events MVP ✅ (one-time only — recurring added in P5)
### P4 — Payments ✅ (PayPlus + webhooks + finances dashboard, ILS) — _was Stripe, swapped 2026-06-02; see entry at the bottom of this file_
### Mobile auth scaffold ✅ (login → home end-to-end, Hebrew RTL, Android + web verified)
### P5 — Initiatives, recurring events, discussions, notification scaffold ✅

(Earlier-phase details captured in prior revisions of this file remain accurate.)

### P5 — what was built

**Backend additions**

- `src/services/recurring.service.ts` — `computeOccurrences()` (pure, unit-tested RRULE expander for daily/weekly/biweekly/monthly + byDay/byMonthDay + until/count); `materializeInstances(parentId, {horizonDays:60})` idempotent inserts; `applyScopedEdit(target, patch, scope)` for `this | future | all`.
- `src/jobs/recurringEvents.job.ts` — `node-cron` schedule `0 3 * * *` plus `materializeAllRecurringParents()` exported for testing/manual runs. Skipped when `NODE_ENV=test`.
- `src/services/event.service.ts` updates: `createEvent` now expands a `type='recurring'` request into a `recurring_parent` + initial 60-day window of `recurring_instance` docs synchronously. `updateEvent` and `cancelEvent` accept `?scope=this|future|all` and now return `IEvent[]` with `meta.{count, scope}`.
- `src/validators/event.validator.ts` extended: `recurrenceRule` zod schema; `type` enum extended to `'one_time' | 'recurring'`; `updateScopeQuerySchema`.
- `src/models/Initiative.ts` — full schema per PRD 14 §3.7 with lifecycle enum (`draft → submitted → under_review → approved → active → completed | rejected`), `supporters`, `contributors`, denormalized counters, `toClientJSON(viewerId?)` that surfaces `viewer.isSupporting/isContributor`.
- `src/models/Post.ts` + `src/models/Comment.ts` (polymorphic via `parentType`) + `src/models/Notification.ts` per PRD 14 §3.8–3.9 + §3.12.
- `src/services/notification.service.ts` — `NotificationService` interface + `ConsoleNotificationService` dev impl that writes to the `notifications` collection AND logs `[notify]` to Winston. Swappable via `_resetNotificationService()` for tests.
- `src/services/initiative.service.ts` — full lifecycle (`createInitiative`, `submitInitiative`, `approveInitiative`, `rejectInitiative`, `addSupport`, `removeSupport`, `addContributor`, `completeInitiative`, `listComments`, `addComment`); approve/reject fire `initiative.approved/rejected` notifications, first supporter fires `initiative.new_supporter` + promotes status to `active`. Includes `ensureCommunityAccess/AuthorOrStaff/Staff` helpers so initiative routes (which don't carry `:cid`) can't be hit cross-tenant.
- `src/services/post.service.ts` — `createPost` (announcements require staff), `pinPost` (staff-only), comment thread w/ `commentCount` denormalization in a transaction, locked posts reject comments.
- Controllers + routes: `initiative.controller.ts`, `post.controller.ts`, `notification.controller.ts`; routers `initiative.routes.ts`, `post.routes.ts`, `notification.routes.ts`, all wired into `routes/index.ts`.
- Audit logs written for initiative create/update/submit/approve/reject/complete/addContributor/delete + post create/update/pin/unpin/delete.

**Backend routes added**

- `GET    /api/v1/communities/:cid/initiatives`
- `POST   /api/v1/communities/:cid/initiatives`
- `GET    /api/v1/initiatives/:iid`
- `PATCH  /api/v1/initiatives/:iid`
- `DELETE /api/v1/initiatives/:iid`
- `POST   /api/v1/initiatives/:iid/submit`
- `POST   /api/v1/initiatives/:iid/approve`
- `POST   /api/v1/initiatives/:iid/reject`
- `POST   /api/v1/initiatives/:iid/support`
- `DELETE /api/v1/initiatives/:iid/support`
- `POST   /api/v1/initiatives/:iid/contributors`
- `POST   /api/v1/initiatives/:iid/complete`
- `GET    /api/v1/initiatives/:iid/comments`
- `POST   /api/v1/initiatives/:iid/comments`
- `GET    /api/v1/communities/:cid/posts`
- `POST   /api/v1/communities/:cid/posts`
- `GET    /api/v1/posts/:pid`
- `PATCH  /api/v1/posts/:pid`
- `DELETE /api/v1/posts/:pid`
- `POST   /api/v1/posts/:pid/pin`
- `POST   /api/v1/posts/:pid/unpin`
- `GET    /api/v1/posts/:pid/comments`
- `POST   /api/v1/posts/:pid/comments`
- `GET    /api/v1/me/notifications`
- `PATCH  /api/v1/me/notifications/:nid/read`

Existing event routes extended:
- `POST   /api/v1/communities/:cid/events` — accepts `type:'recurring'` + `recurrenceRule`
- `PATCH  /api/v1/events/:eid?scope=this|future|all` — returns array of affected events
- `POST   /api/v1/events/:eid/cancel?scope=this|future|all` — returns array

**Backend tests added (74 → 94 total, all green)**

- `tests/unit/recurring.service.test.ts` — daily count=5; weekly + byDay=MO; biweekly; until; range filter.
- `tests/integration/recurring.test.ts` — weekly count=4 produces 4 instances on create; cron idempotency (re-run creates 0); PATCH ?scope=all updates parent + all instances; cancel ?scope=all cancels every event in the series.
- `tests/integration/initiatives.test.ts` — full lifecycle (create draft → submit → approve → notification written → support promotes to active → counter updates → unsupport); reject writes rejection notification; non-staff cannot approve (404 default-deny); comments increment `commentCount` + ordered list; author completes with summary.
- `tests/integration/posts.test.ts` — member creates discussion; admin pins; member can't pin; locked posts reject comments; non-staff can't publish announcement (403); list returns pinned first.
- `tests/integration/notifications.test.ts` — list scoped to caller; mark-read is per-user + idempotent (404 on second call); cross-user mark-read 404.

**Coverage (P5-touched files)**

- `recurring.service.ts`: 100% functions / 87% lines
- `initiative.service.ts`: ~87% functions / ~86% lines
- `post.service.ts`: 100% functions / 90% lines
- `notification.service.ts`: 100% / 100%
- `initiative.controller.ts` / `post.controller.ts` / `notification.controller.ts`: 90%+ lines via integration

**Mobile additions (14 → 18 tests, all green)**

- `lib/data/models/initiative_dto.dart` — `InitiativeDto`, `CommentDto`, `PostDto`.
- `lib/data/repositories/initiative_repository.dart` + `post_repository.dart` — abstract + Dio implementations.
- `lib/features/initiatives/presentation/`:
  - `providers/initiative_providers.dart` — `initiativeRepositoryProvider`, `initiativesProvider(cid)`, `initiativeDetailProvider(iid)`, `initiativeCommentsProvider(iid)`.
  - `screens/initiatives_screen.dart` — list with status chip + counters, FAB → new initiative.
  - `screens/new_initiative_screen.dart` — form (title / description / category) + Hebrew validation + "Save draft" / "Submit for review".
  - `screens/initiative_detail_screen.dart` — body + status chip + supporter count + support/unsupport toggle + comments list + composer.
- `lib/features/discussions/presentation/`:
  - `providers/post_providers.dart`.
  - `screens/discussions_screen.dart` — feed with pinned-first ordering, pinned/locked badges, inline post composer.
- `lib/core/router/app_router.dart` — added 4 routes (`/communities/:cid/initiatives`, `/communities/:cid/initiatives/new`, `/initiatives/:iid`, `/communities/:cid/discussions`).
- `lib/features/home/presentation/screens/home_screen.dart` — added "יוזמות" + "שיחות" buttons for members of at least one community.
- `lib/core/i18n/strings.dart` — Hebrew strings for initiatives + discussions + statuses + categories.
- `test/unit/initiative_repository_test.dart` — list 200, list 401, support 200, get 404 (draft visibility).

## Cumulative deviations (with reasoning)

See DECISIONS.md for full rationale. New in P5:
- Recurring events use a hand-rolled RRULE expander (no `rrule` npm dep) covering only PRD 08 §2.2 surface.
- `PATCH /events/:eid` and `/cancel` now always return `IEvent[]` to support `?scope`.
- Initiatives 404 to non-staff non-authors when in `draft / submitted / rejected / under_review` (default-deny per PRD 18).
- NotificationService is a console + DB stub; FCM / email plumbing in P7.

## How to verify

```bash
# Backend
cd backend
npm install
npm run typecheck       # green
npm run lint            # green
npm test                # 94 tests pass
npm run test:coverage   # thresholds satisfied

# Stack
cd ..
docker compose up
curl http://localhost:3000/api/v1/health

# Mobile
cd mobile
flutter pub get
flutter analyze         # 1 pre-existing info
flutter test            # 18 tests pass
```

## What's NOT yet built

- Full mobile UI for events list, RSVP screens, member directory, calendar (P6)
- Sub Admin-specific UI variations + Super Admin console (P6)
- FCM push delivery + email templates + onboarding polish (P7)
- Admin moderation queue UI (post moderation, flagged content)
- Initiative "post update" endpoint (PRD 11 §6.6) — current scope covers comments only; updates can use the post-with-type='update' endpoint as a workaround
- Q&A on events (PRD 06 §8) — uses the same Comment polymorphic collection but no dedicated routes yet
- Member device registration (`POST /me/devices` for FCM tokens — P7)

## Next prompt to resume

> Continue with **P6 — Mobile UI completion** from `prds/20-roadmap-milestones.md` and `prds/12-mobile-app-flutter.md`. The backend exposes 50+ routes from P0–P5 (auth, communities, events with recurring, payments, initiatives, discussions, notifications) and is verified at 94 backend tests / 18 mobile tests. The mobile app has auth scaffolding + Hebrew RTL + screens for subscriptions / finances / initiatives / discussions but no event browsing, RSVP, member list, admin members management, or notification inbox yet.
>
> Build, in this order:
> 1. **`lib/features/events/`** — `events_list_screen.dart` (PRD 07 §4.2: upcoming/past, filters), `event_detail_screen.dart` (PRD 07 §4.3: RSVP button with 402→checkout flow already in the payment repo, capacity badge, materials list), `EventRepository` + providers. Hebrew RTL throughout. Tests for the repo (list 200, detail 200, 402 path).
> 2. **`lib/features/members/`** — `members_list_screen.dart` (admin only — calls `/api/v1/communities/:cid/members`), `invite_member_screen.dart`, role-change dialog. Mobile MembershipRepository.
> 3. **`lib/features/inbox/`** — Notification inbox screen using `GET /api/v1/me/notifications`, mark-read on tap, polling every 30s while screen is active, unread badge on bottom-nav tab.
> 4. **Bottom navigation** — replace the placeholder Home with the 5-tab layout from PRD 12 §5 (Home / Events / Initiatives / Inbox / Profile). Admin variant adds an "Admin" tab. Sub-admin variant hides finances per PRD 05. Implement via `ShellRoute` in `go_router`.
> 5. **Profile screen** — `/profile` with name / photo / bio / interests edit (already supported by backend `PATCH /auth/me`), my-RSVPs, my-initiatives, my-subscriptions deep links.
> 6. **Super Admin console** — `/super` shell route, communities list + create + suspend/restore, only visible when `globalRole=superadmin`.
> 7. **Empty states + loading skeletons** — pull the dev/Lorem placeholders out, ensure every screen has the four states (loading / error / empty / populated) per PRD 12 §8 (LoadingShimmer, EmptyState).
> 8. **Dark mode + RTL spot-check** on every new screen. Material 3 + `AlignmentDirectional` everywhere.
> 9. **Widget tests** for each repo (happy + 401), one golden test for `EventCard`, integration-test smoke (`integration_test/`) for login → events list → event detail.
>
> Small backend additions for P6: expose `GET /api/v1/me/feed` (PRD 13 §Me) that returns a personalized list — for v1 just merge recent events + recent initiatives + recent posts, no ranking. Add `GET /api/v1/me/rsvps` and `GET /api/v1/me/managed-events`. Tests + lint + typecheck green; update `docs/PROGRESS.md` + `docs/DECISIONS.md`.
>
> No changes to recurring events, payments, initiatives moderation backend, or notification scaffolding in P6.

---

## 2026-06-02 — Stripe → PayPlus migration (replaces P4 payments stack)

The Stripe payment surface from P4 has been replaced with PayPlus (Israeli gateway). The product targets Israeli communities collecting ILS, and Stripe does not onboard Israeli merchants. The migration was platform-managed (single PayPlus merchant account, flat SaaS fee) with SAQ-A PCI scope via hosted pages.

### Backend — removed

- `backend/src/services/stripe.service.ts` — the entire `StripeService` interface + `RealStripeService` + `StubStripeService`.
- `backend/src/services/webhook.service.ts` — Stripe-typed `handleWebhookEvent` + per-event handlers.
- `backend/src/controllers/payment-dev.controller.ts` — the dev-only HTML stub Checkout page (no longer needed; `PayPlusSandboxClient` is the dev fallback).
- `backend/tests/helpers/fakeStripe.ts`, `backend/tests/unit/stripe.service.test.ts`, `backend/tests/unit/realStripe.service.test.ts`, the legacy `payments.test.ts`.
- `stripe` npm dependency (uninstalled).
- `Subscription.stripeSubscriptionId` / `stripeCustomerId`, `Payment.stripePaymentIntentId` / `stripeCheckoutSessionId`, `Community.stripeAccountId`. All four are dropped from the schemas; the migration script preserves data by renaming.

### Backend — added

- `backend/src/services/payment/PayPlusClient.ts` — axios-based REST client + `PayPlusSandboxClient` (gated by `PAYPLUS_SANDBOX_MODE`) + `verifyHmacSignature(secret, body, sig)` exported for the webhook handler.
- `backend/src/services/payment/GatewayService.ts` — the single entry point controllers may use. Persists Payment / Subscription rows before the gateway call; owns the webhook state machine (`payment_success`, `payment_failure`, `recurring_payment_success/failure`, `recurring_cancelled`, `refund_success`); emits notifications on terminal transitions.
- `backend/src/controllers/webhook.controller.ts` — rewritten as `payplusWebhook`, raw-body, HMAC-verified before parsing, truncated body logging.
- `backend/src/jobs/subscriptionRetry.job.ts` — daily @ 04:00, re-charges `gatewayToken` for past_due subscriptions; ≥3 failed attempts → cancelled + notification.
- `backend/src/jobs/expirePayments.job.ts` — every 15 min, flips pending Payment rows older than 30 min to failed.
- `backend/src/middleware/rateLimiter.ts` — new `paymentSuccessLimiter` (10/min/IP) for the `/payments/success` poll endpoint.
- `backend/scripts/migrateStripeToPayplus.ts` + `npm run migrate:stripe-to-payplus` — one-shot, idempotent field renames at the native MongoDB driver level.
- Payment / Subscription models rewritten as gateway-agnostic (`gateway: 'payplus' | 'external'`, `gatewayTransactionId` (unique sparse), `gatewayPaymentPageId`, `gatewayToken` (`select: false`), `gatewaySubscriptionId`); Payment gains `installments` (1..12); Subscription gains `failedAttempts`.
- `Event.pricing` now defaults `currency='ILS'` and adds `maxInstallments` (1..12).

### Mobile — changed

- `data/models/payment_dto.dart` — `CheckoutResultDto.sessionUrl` → `paymentUrl`; new `PaymentStatusDto` for the poll loop.
- `data/repositories/payment_repository.dart` — `getPaymentStatus(paymentId)` added.
- `features/payments/presentation/providers/payment_providers.dart` — `CheckoutNotifier` now polls `/payments/success?ref=…` every 2s up to 60s after launching the URL; returns a `CheckoutOutcome` enum (`confirmed | failed | timeout | cancelled`) so the UI can branch cleanly.
- `features/payments/presentation/screens/checkout_screen.dart` — single CTA "לתשלום", "עד X תשלומים" line when `maxInstallments > 1`, inline "מעבד תשלום..." while polling.
- `core/utils/format_currency.dart` — new `formatILS(int agorot)` + `formatInstallments(…)` helper. Replaces inline `_money` helpers across mobile.
- `features/payments/presentation/screens/finances_screen.dart` — drops `intl` USD `NumberFormat` in favour of `formatILS`.
- `features/payments/presentation/screens/refund_received_screen.dart` — defaults to `'ILS'`, uses `formatILS`.
- `features/super/presentation/screens/platform_settings_screen.dart` — `stripeRevealed/stripeKeyMasked` → `payplusRevealed/payplusKeyMasked`.
- i18n strings + `Event.pricing.currency` / `Community` defaults: `USD` → `ILS`; `Stripe` → `PayPlus` (checkoutSecuredBy, superSettingsBilling); `'מחיר (USD)'` → `'מחיר (₪)'`.

### Tests

| Suite | Before | After |
|---|---|---|
| Unit | `stripe.service.test.ts`, `realStripe.service.test.ts` | `PayPlusClient.test.ts` (`verifyHmacSignature` truth/false + body mutation, `FakePayPlusClient` shape, refund param mapping) |
| Integration | `payments.test.ts` (Stripe-shaped) | `payments.test.ts` (PayPlus-shaped: 12 cases — checkout shape, gatewayToken non-leak, webhook signature 401, payment_success → succeeded + RSVP, idempotent replay → duplicate:true, payment_failure → failed, recurring_payment_success → active + period extended, admin refund → refunded + RSVP cancelled, sub-admin refund → 403, refund outside policy window → 400, subscribe → incomplete + paymentUrl, cancel → cancelAtPeriodEnd:true) + `GET /payments/success` (unknown/valid) |
| Migration | none | `migration.test.ts` (3 cases — empty DB no-op, rename Stripe legacy fields, second run is idempotent) |

`npm test` is green: **82 / 82 passing** (was 79 / 79). `npm run typecheck` 0 errors; `npm run lint` 0 errors.

### Coverage gap honestly logged

- `PayPlusRestClient` (the real network path) is exercised only via type-checking; runtime coverage comes from the sandbox client + `FakePayPlusClient` because PayPlus offers no free CI sandbox. A staging environment with real creds is required to exercise the real client end-to-end — see `RUNBOOK.md` § "Exercising the webhook locally" for the ngrok setup. The verifyHmacSignature path itself is exercised directly.
- `expirePayments.job.ts` and `subscriptionRetry.job.ts` are unit-runnable (`runSubscriptionRetries()` / `expireStalePendingPayments()` are exported) but do not yet have dedicated tests — TODO(v1.5) at the bottom of this entry.

### PayPlus quirks noted during implementation

- The PayPlus REST docs are intermittently unclear about response shapes; the client tolerates `res.data?.data ?? res.data` to handle both wrapped + flat responses. The sandbox client returns the same shape so tests are stable regardless.
- `Authorization: <API_KEY>.<SECRET_KEY>` is the documented format — note the literal dot separator, not a `Bearer` prefix.
- Amounts go on the wire in shekels with up to two decimals (`/ 100` from agorot), not in agorot. The model still persists `amountCents`.
- The supertest webhook tests had to switch from `Buffer` bodies to JSON strings — supertest JSON-encodes a Buffer when `Content-Type: application/json` is set, which would change the bytes the HMAC was computed against. Production PayPlus sends the JSON string directly; the test fix mirrors that.
- Refund window is read from `Event.pricing.refundPolicyHours` and checked against `Payment.createdAt` inside `GatewayService.issueRefund`. The webhook-side `refund_success` does NOT enforce the window — refunds initiated by support staff via the PayPlus dashboard are honoured unconditionally.

### TODO(v1.5)

- Community-connected model (per-community PayPlus sub-merchant).
- Field-level encryption for `gatewayToken` at rest (currently `select: false` + DB encryption-at-rest is the perimeter).
- Alternate Israeli gateways (Tranzila, Cardcom) via the same `PayPlusClient` interface.
- Multi-currency (USD) at the gateway level.
- Promo codes.
- Annual plan in production (the schema supports `plan: 'annual'`; the price + UI bring-up is parked).
- Apple Pay / Google Pay native SDKs (currently every payment goes through the PayPlus hosted page).
- EMI licensing review before enabling installments > 6 in production.
- Dedicated jest coverage for `subscriptionRetry.job.ts` + `expirePayments.job.ts`.
