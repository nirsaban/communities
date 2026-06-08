# Member agent

## Persona
**Mike** is the citizen — joins communities, RSVPs to events, supports initiatives, reads/comments on posts, subscribes, manages own privacy + notifications. No power over anyone else. Mike is the polish surface — the majority of users.

## Login
`mike-member@example.com / RolePass123!` → lands on `/home`. Demo seed makes him a member of Acme Devs and auto-subscribes him to the community (monthly, active).

## Scope of work

### Owned screens
- `/home` — HomeFeedScreen (greeting · pinned announcement · happening-soon rail · feed · active initiatives mini-rail)
- `/discover` — DiscoverScreen (join / request communities)
- `/events` — EventsListScreen with list ⇄ calendar toggle
- `/events/:eid` — EventDetailScreen (cover + sticky pay-bar, subscriber-perk swap)
- `/events/:eid/checkout` — CheckoutScreen (Stripe redirect)
- `/events/:eid/confirmed` — RsvpConfirmationScreen
- `/events/:eid/waitlist` — WaitlistJoinedScreen
- `/events/:eid/materials` — MaterialsScreen (gated to RSVP=going + manager)
- `/events/:eid/qa` — EventQAScreen (read-open, write-gated to RSVP)
- `/events/:eid/recap` — PostEventSummaryScreen (gated to attendees / community-after-completed)
- `/me/rsvps` — MyRsvpsScreen
- `/posts` + `/posts/:pid`
- `/initiatives` + `/initiatives/:iid` + `/initiatives/new`
- `/me/notifications` — InboxScreen
- `/me/notifications/prefs` — NotificationPrefsScreen
- `/profile` — ProfileScreen (avatar · stats · interests · menu · Sign out)
- `/profile/edit` — EditProfileScreen
- `/profile/settings` — SettingsScreen (language toggle + Sign out)
- `/profile/privacy` — PrivacySettingsScreen
- `/profile/delete` — AccountDeletionScreen
- `/c/:cid/welcome` + `/c/:cid/rules` + `/c/:cid` — community shell
- `/c/:cid/subscribe` — SubscriptionPlansScreen
- `/me/subscriptions` — ManageSubscriptionScreen
- `/me/subscriptions/:sid/cancel` — CancelSubscriptionScreen
- `/payments/success` + `/payments/cancel` + `/payments/refunded`

### Backend
- `/me/communities`, `/me/rsvps`, `/me/managed-events`, `/me/notifications`, `/me/subscriptions`, `/me/privacy` — all standard authenticated user endpoints
- `/communities/:cid/events`, `/posts`, `/initiatives` — read-open within communities he's a member of
- `/events/:eid/rsvp`, `/events/:eid/cancel-rsvp` — write
- `/events/:eid/qa` — read open, ask/upvote gated by RSVP=going
- `/communities/:cid/subscribe` — Stripe checkout
- `/me/subscriptions/:sid/cancel` — cancel at period end

## Invariants
1. HomeFeed handles 3 states: no community → welcome empty; pending application → "under review"; active → full feed.
2. EventDetail subscriber-perk: subscriber sees `~~₪150~~ Included in your sub`, RSVP skips Stripe; non-subscriber sees `₪150` + "Free for subscribers · Join" upsell.
3. Materials gated: must have `myRsvp.status === 'going'` OR be manager.
4. Recap gated: must be attendee OR event.status === 'completed' (then community-open) OR manager.
5. EventQA: read open to community; ask/upvote gated to RSVP=going; manager always allowed.
6. Bell badge in HomeFeed header shows unread count from `useNotifications()`.
7. BottomNav: Home · Events · Initiatives · Inbox (with badge) · Profile.

## Verification matrix
- Mike → `/home` shows: greeting, happening-soon rail, active initiatives, bell badge.
- Mike → paid event detail: ~~₪150~~ + "Included in your sub" (he's auto-subscribed).
- Mike (NOT RSVP'd) → `/events/<eid>/materials` → "Materials open to attendees" lock state.
- Mike → `/events/<eid>/qa` → can read; ask composer shows "RSVP to ask & upvote" footer.
- Mike → `/admin` → `/403`.
- Mike → `/super/*` → `/403`.
- Mike → `/manage/events` → renders empty (he manages no events).
- Mike → `/profile` → Sign out button works (navs to `/login`).

## How to debug
1. Login Mike, walk every BottomNav tab.
2. Check bell badge updates when a notification arrives.
3. RSVP to an event, then check materials/recap unlock.
4. Cancel his subscription → re-check EventDetail pay-bar → should now show price + upsell.
