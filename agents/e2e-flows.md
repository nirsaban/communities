# E2E Flows agent

## Persona
Cross-role choreographer. Knows every role's surface and walks **end-to-end journeys** that span multiple roles. Used for regression sweeps, demo prep, and verifying that role handoffs work cleanly.

## Login(s)
Walks the full demo cast. See `agents/README.md` for creds.

## Flows in scope

### 1. Onboarding: new community
Super → Admin → Members.
1. Bob → `/super/communities/new` → creates "Acme Yoga", initialAdmin = `yoga-admin@example.com`.
2. Backend issues invitation token, web shows `/invite/<token>` link.
3. Bob opens the link in incognito. The invitation page peeks the invite, shows community + role.
4. New admin enters name + password → `POST /invitations/:token/accept` → returns tokens + creates user + assigns admin role + records `community.initialAdminId`.
5. Lands in `/admin/wizard` because `wizardCompletedAt` is null.
6. Walks all 6 wizard steps (basics → branding → privacy → experience → first event → invites).
7. Lands in `/admin`.

### 2. Member journey: discover → join → RSVP → attend → recap
Member from scratch.
1. Mike signs up via `/signup`.
2. Verifies email via `/verify` (6-digit code from backend logs).
3. Profile setup + interests.
4. `/discover` → joins Acme Devs (public privacy).
5. `/home` populates with feed.
6. Browses `/events`, taps a paid event.
7. Sees subscriber-perk pay-bar (after subscribing via `/c/:cid/subscribe`).
8. RSVPs → `/events/:eid/confirmed`.
9. After event completes, opens `/events/:eid/recap`.

### 3. Event lifecycle: admin → manager → member
1. Alice creates a paid event with capacity 20.
2. Alice assigns Eve as event manager via `/admin/events/:eid/managers`.
3. Eve sees the event in `/manage/events` immediately.
4. Eve uploads materials, broadcasts a reminder.
5. Mike RSVPs (subscriber-free path or pays).
6. Day of event: Eve checks in attendees via `/events/:eid/attendees`.
7. After: Eve publishes recap with 3 photos.
8. Mike sees recap on `/events/:eid/recap`.

### 4. Sub-admin moderation
1. Alice promotes Sam to sub-admin via `/admin/members/:uid`.
2. Sam logs in, lands on `/admin` (Limited admin pill).
3. Sam approves a pending member via `/admin/members/pending`.
4. Sam moderates a flagged post via `/admin/moderation`.
5. Sam tries `/admin/finances` → /403.
6. Sam creates a free event via `/admin/events/new` (locked pricing).

### 5. Subscription full loop
1. Mike subscribes → Stripe checkout → `/payments/success`.
2. Mike sees `~~₪150~~ Included in your sub` on paid events.
3. Mike cancels via `/me/subscriptions/:sid/cancel` (cancels at period end).
4. After period: subscription expires, paid events show `₪150` again with upsell link.

### 6. Suspended community
1. Bob suspends Acme Devs via `/super/communities/:cid` (confirmation card).
2. Mike loads `/c/:cid` → renders SuspendedCommunityScreen (cannot interact).
3. Bob restores → Mike's access returns.

### 7. Refund cycle
1. Mike paid for an event.
2. Alice goes to `/admin/finances` → finds payment in recent list.
3. `/admin/payments/:pid/refund` → issues partial refund.
4. Mike sees refund notification, payment in `/me/subscriptions` history shows partial_refund.

## Invariants across the matrix
1. Role gates hold at backend (curl probes match expected status codes per `agents/sub-admin.md` + `agents/event-manager.md`).
2. AUDIT log captures every super + admin action with actor.
3. Money-blindness for sub-admin survives every flow.
4. Per-event scoping for Eve survives every flow.
5. Subscriber-perk swap happens live on EventDetail.
6. Invite tokens single-use (re-accept returns 409).

## How to debug
1. Pick a flow and walk it manually with the demo creds.
2. If a step fails, find the file in the matching role agent's scope and fix.
3. Re-run the `apiTestDashboard.ts` after fixes for green sweep.
