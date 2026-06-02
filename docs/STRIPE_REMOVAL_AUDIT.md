# Stripe removal audit

Date: 2026-06-02. Captured before Step 0 of the PayPlus migration. This is the
exhaustive inventory of every Stripe touchpoint in the repo at HEAD `25e2e2c`,
so the migration can be traced through code review.

## Backend (`backend/src/`)

| Path | Lines | What it does |
| --- | --- | --- |
| `app.ts` | 37, mount of `webhookRouter` | Mounts `/api/v1/webhooks/stripe` before `express.json()` so the raw body survives. |
| `config/env.ts` | 43–50 | Zod-validated env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_API_VERSION`, `STRIPE_PLATFORM_FEE_BPS`, `STRIPE_SUBSCRIPTION_MONTHLY_PRICE_ID`, `STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID`, plus `CHECKOUT_SUCCESS_URL`, `CHECKOUT_CANCEL_URL`. |
| `models/Payment.ts` | 17–18, 36–37, 54–55 | Fields `stripePaymentIntentId`, `stripeCheckoutSessionId`; unique sparse indexes on both. |
| `models/Subscription.ts` | 10–11, 26–27 | Required `stripeSubscriptionId` + optional `stripeCustomerId`; unique index on `stripeSubscriptionId`. |
| `models/Community.ts` | 45, 104 | Optional `stripeAccountId` (Stripe Connect placeholder). |
| `services/stripe.service.ts` | entire file | `StripeService` interface + `RealStripeService` (uses official `stripe` npm package) + `StubStripeService` (dev-only). |
| `services/payment.service.ts` | 9, 26, 83, 97–98, 101–102, 108, 116–117, 119–123, 129, 140, 160, 162, 207–208, 219–222, 382, 401, 451 | Calls into `getStripeService()` for event checkout, subscription checkout, cancel, refund. References Stripe-shaped fields on Payment + Subscription docs. |
| `services/webhook.service.ts` | entire file | Stripe-typed event handlers: `checkout.session.completed`, `payment_intent.payment_failed`, `customer.subscription.created/updated/deleted`, `charge.refunded`. ProcessedWebhook collection keyed by `event.id`. |
| `controllers/webhook.controller.ts` | entire file | `stripeWebhook` handler — reads `stripe-signature` header, calls `verifyWebhookEvent`, dispatches to `handleWebhookEvent`. |
| `controllers/payment.controller.ts` | imports + `checkout`, `subscribe`, `cancelSubscription`, `refund` | Indirectly via `payment.service`. |
| `controllers/payment-dev.controller.ts` | entire file | Local HTML stub Checkout page; routes `/payments/_dev/{checkout,settle,done}`. Mints `pi_stub_*`, `cs_stub_*`, `sub_stub_*`. |
| `controllers/event.controller.ts` | 123 | Comment + 402 flow handing back `checkoutUrl`. |
| `controllers/super.controller.ts` | 26 | Returns `stripeKeyMasked: '••••••••••••••••'` from `/super/platform-settings`. |
| `routes/payment.routes.ts` | 82–124 | Mounts `/_dev/checkout|settle|done` and `/webhooks/stripe`. |
| `services/event.service.ts` | 219 | Comment referencing Stripe URL handoff. |

## Backend tests (`backend/tests/`)

| Path | Notes |
| --- | --- |
| `jest.env.ts` | Seeds `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUBSCRIPTION_MONTHLY_PRICE_ID`, `STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID`. |
| `helpers/fakeStripe.ts` | In-memory `FakeStripeService` implementing the `StripeService` interface. |
| `unit/stripe.service.test.ts` | Unit tests for stub swap. |
| `unit/realStripe.service.test.ts` | Stripe SDK adapter shape tests. |
| `integration/payments.test.ts` | E2E checkout, webhook, refund, subscription cancel using `FakeStripeService`. |

## Mobile (`mobile/lib/`)

| Path | Lines / notes |
| --- | --- |
| `core/i18n/strings.dart` | 182 (`Stripe` redirect copy), 393 (`מאובטח על-ידי Stripe`), 400 (`מאמת מול Stripe...`), 513 (`מחיר (USD)`), 733 (`מפתחות חיוב (Stripe)`). |
| `core/router/app_router.dart` | 320 (`currency: qp['currency'] ?? 'USD'`). |
| `features/home/presentation/screens/home_screen.dart` | 414 (`case 'USD':` currency formatter). |
| `features/events/presentation/screens/create_event_screen.dart` | 103, 110, 114, 116, 118 (`'currency': 'USD'`). |
| `features/events/presentation/screens/edit_pricing_screen.dart` | 50 (`'currency': 'USD'`). |
| `features/events/presentation/screens/event_detail_screen.dart` | 658 (`case 'USD':`). |
| `features/events/presentation/screens/events_list_screen.dart` | 265 (`case 'USD':`). |
| `features/payments/presentation/providers/payment_providers.dart` | 47 (`Stripe session` doc comment). |
| `features/payments/presentation/screens/checkout_screen.dart` | 14–15 (Stripe handoff comment), 240 (`case 'USD':`). |
| `features/payments/presentation/screens/payment_success_screen.dart` | 51 (`came back from the external Stripe page` comment). |
| `features/payments/presentation/screens/refund_received_screen.dart` | 16 (`this.currency = 'USD'`), 33 (`case 'USD':`). |
| `features/payments/presentation/screens/finances_screen.dart` | 15–16 (`NumberFormat.currency(locale: 'he', symbol: '\$')`). |
| `features/super/presentation/screens/platform_settings_screen.dart` | 22 (`_stripeRevealed`), 62 (`stripeKeyMasked` from API), 90–96 (toggle UI). |
| `data/repositories/payment_repository.dart` | 7 (`Stripe Checkout Session` doc), 10, 19. |
| `data/repositories/event_repository.dart` | 33 (`hand off to Stripe`). |
| `data/models/community_dto.dart` | 119, 148 (`'USD'` defaults). |
| `data/models/event_dto.dart` | 98, 242 (`'USD'` defaults). |
| `pubspec.yaml` | Single comment line referring to Stripe; no actual Stripe Dart packages installed. |

## npm package

- `backend/package.json` lists `"stripe": "^17.7.0"` as a runtime dependency.

## Treatment plan

| Symbol | Replacement |
| --- | --- |
| `stripePaymentIntentId` | `gatewayTransactionId` (Payment) |
| `stripeCheckoutSessionId` | `gatewayPaymentPageId` (Payment) |
| `stripeSubscriptionId` | `gatewaySubscriptionId` (Subscription) |
| `stripeCustomerId` | dropped (PayPlus has no analog in v1 — terminal id lives in `gatewayToken`) |
| `stripeAccountId` (Community) | dropped (platform-managed v1) |
| `STRIPE_SECRET_KEY` | `PAYPLUS_SECRET_KEY` |
| `STRIPE_WEBHOOK_SECRET` | `PAYPLUS_WEBHOOK_SECRET` |
| `STRIPE_PLATFORM_FEE_BPS` | dropped (single merchant model) |
| `STRIPE_SUBSCRIPTION_*_PRICE_ID` | dropped (PayPlus recurring is amount-based) |
| `CHECKOUT_SUCCESS_URL` / `CHECKOUT_CANCEL_URL` | `PLATFORM_PAYMENT_SUCCESS_URL` / `PLATFORM_PAYMENT_FAILURE_URL` |
| `checkout.session.completed` | `payment_success` (PayPlus webhook event) |
| `payment_intent.payment_failed` | `payment_failure` |
| `customer.subscription.*` | `recurring_payment_success` / `recurring_payment_failure` / `recurring_cancelled` |
| `charge.refunded` | `refund_success` |

## Out of audit scope

- `docs/DECISIONS.md` historical entries are preserved verbatim (audit trail).
- `prds/` is treated as design history. No edits there.
