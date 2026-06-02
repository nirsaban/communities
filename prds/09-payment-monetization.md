# PRD 09 — Payment & Monetization

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Communities can monetize through one-time event payments, recurring subscriptions, and external payment pages. Stripe is the primary payment processor.

## 2. Payment models

### 2.1 Single paid event
- Member pays once to attend a specific event
- Payment confirmed → RSVP recorded
- Refundable within configurable window (e.g., up to 24h before event)

### 2.2 Monthly subscription
- Member pays monthly fee for access to all events / lectures in the community
- Auto-renews until cancelled
- Pro-rated cancellation: keep access until end of paid period
- Optional annual plan with discount

### 2.3 External payment page
- For communities not using in-app payments
- Event has a "Pay externally" URL
- Member taps → browser opens external page (PayPal, Israeli payment provider, etc.)
- Admin manually marks RSVPs as paid (or via webhook from external provider)
- Used for v1 as fallback while Stripe integration matures

### 2.4 In-app payment (Stripe)
- Stripe Checkout (hosted) for v1
- Apple Pay / Google Pay on supported devices
- Stripe Elements for embedded checkout (Phase 2)

## 3. Stripe integration architecture

### 3.1 Platform model
The platform uses Stripe Connect (Standard accounts):
- Each community connects their own Stripe account
- Funds flow directly to community's Stripe account
- Platform takes a configurable fee (e.g., 5% application_fee_amount)
- Refunds processed against the connected account

Alternative for early launch: platform-managed Stripe with manual payouts to communities. Decided at deployment time.

### 3.2 Webhooks
Endpoint: `/api/v1/webhooks/stripe`
Events handled:
- `checkout.session.completed` → mark payment + RSVP
- `payment_intent.succeeded` → confirmation
- `payment_intent.payment_failed` → notify user
- `customer.subscription.created` → activate subscription
- `customer.subscription.updated` → handle status changes
- `customer.subscription.deleted` → revoke access at period end
- `charge.refunded` → revoke event access

Webhook signature verification with `stripe.webhooks.constructEvent`.

## 4. Data model

### `payments` collection
```
{
  _id,
  communityId,
  userId,
  eventId,            // if event payment
  subscriptionId,     // if subscription payment
  stripePaymentIntentId,
  stripeCheckoutSessionId,
  amountCents,
  currency,
  status,             // 'pending' | 'succeeded' | 'failed' | 'refunded'
  refundedAmountCents,
  metadata,
  createdAt,
  updatedAt
}
```

### `subscriptions` collection
```
{
  _id,
  communityId,
  userId,
  stripeSubscriptionId,
  stripeCustomerId,
  plan,               // 'monthly' | 'annual'
  status,             // 'active' | 'past_due' | 'cancelled' | 'incomplete'
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  createdAt,
  updatedAt
}
```

## 5. Pricing model on Event document

```
event.pricing = {
  type: 'free' | 'paid' | 'subscription_only' | 'external',
  priceCents: 5000,                      // for 'paid'
  currency: 'USD',
  refundPolicyHours: 24,                 // hours before start that refunds allowed
  externalUrl: 'https://...',            // for 'external'
  subscriptionIncluded: true             // true means subscribers get free access
}
```

## 6. Checkout flows

### 6.1 Single paid event
```
Tap RSVP → POST /events/:eid/checkout
        → server creates Stripe Checkout Session
        → server returns sessionUrl
        → Flutter opens sessionUrl in WebView or browser
        → user pays → Stripe redirects to success_url
        → webhook fires → backend marks payment + RSVP
        → app polls /events/:eid/rsvp until status = confirmed
```

### 6.2 Subscription
```
Tap Subscribe → POST /communities/:cid/subscribe
             → server creates Stripe Checkout Session (mode: subscription)
             → user pays
             → webhook fires → subscription activated
             → user gets free access to all subscription-included events
```

### 6.3 Cancellation
```
User taps "Cancel subscription"
  → POST /me/subscriptions/:sid/cancel
  → server calls stripe.subscriptions.update(id, { cancel_at_period_end: true })
  → user keeps access until period end
  → on period end, webhook deactivates access
```

## 7. Refunds

- Admin (not Sub Admin) can issue refunds from event detail
- Partial refunds supported
- Refund triggers RSVP cancellation
- User notified via push + email

## 8. API endpoints

| Method | Path | Description |
|---|---|---|
| POST | /events/:eid/checkout | Create Stripe Checkout Session for event |
| POST | /communities/:cid/subscribe | Create subscription Checkout Session |
| GET | /me/subscriptions | My active subscriptions |
| POST | /me/subscriptions/:sid/cancel | Cancel subscription |
| GET | /events/:eid/payments | Admin only — list event payments |
| POST | /payments/:pid/refund | Admin only — issue refund |
| POST | /webhooks/stripe | Stripe webhook receiver |

## 9. Currency and tax

- v1: USD only
- v2: multi-currency (each community sets default)
- Tax: communities responsible for their own tax handling; platform doesn't compute tax in v1
- Future: Stripe Tax integration

## 10. Security

- Stripe API keys stored in env vars, never in frontend
- Webhook signing secret validated on every webhook call
- All payment routes require auth
- Sub Admins blocked from all payment endpoints (PRD 05)
- PCI compliance handled by Stripe (no card data touches our servers)

## 11. Acceptance criteria

- Member can pay for a single event and immediately see RSVP confirmation
- Subscriber gets automatic access to subscription-included events without per-event payment
- Webhook handles delayed payment confirmation (e.g., 1 minute delay) without failing
- Admin can issue a full or partial refund from event detail screen
- Refunded user's RSVP is cancelled and they're notified
- Sub Admin attempting refund or financial view receives 403
- All payment data is correctly logged for accounting

## 12. Out of scope (v1)

- Promo codes / discounts
- Group purchase / corporate billing
- Multi-currency conversion
- Crypto payments
- Buy-now-pay-later (Klarna, Affirm)
- Stripe Tax
