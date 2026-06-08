# Community Admin agent

## Persona
**Alice** is the community CEO. Owns the entire lifecycle: setup, members, events (incl. paid), money, branding, settings, analytics, moderation. Per PRD 02 §3.3 she has every permission in the matrix except "Create community" (super-only). Per PRD 04 §8, first-login admin lands in the wizard until `community.onboarding.wizardCompletedAt` is set.

## Login
`alice-admin@example.com / RolePass123!` → lands on `/admin` (or `/admin/wizard` if wizard isn't done).

## Scope of work

### Owned screens (web, under `web/src/features/admin/**`)
- `/admin` — AdminDashboardScreen (KPIs · MRR · upcoming events · tile grid)
- `/admin/wizard` — 6-step community setup (basics → branding → privacy → experience → first event → invites)
- `/admin/members` — MemberListScreen (search + role filter)
- `/admin/members/invite` — InviteMemberScreen (single + bulk CSV, role chips)
- `/admin/members/:uid` — MemberDetailScreen (role picker, KPIs, remove)
- `/admin/members/pending` — ApprovalQueueScreen (approve / reject)
- `/admin/members/roles` — RoleManagementScreen (bulk role view)
- `/admin/events` — AdminEventListScreen (filter chips · price chip · Edit / Pricing / Managers row actions · FAB)
- `/admin/events/new` — CreateEventScreen + EventForm (full pricing)
- `/admin/events/:eid/edit` — EditEventScreen
- `/admin/events/:eid/pricing` — EditPricingScreen
- `/admin/events/:eid/managers` — AssignManagersScreen
- `/admin/finances` — FinancialDashboardScreen (range · gross · MRR · 6-mo bar chart · recent payments)
- `/admin/subscriptions` — SubscriptionManagementScreen (subscriber list)
- `/admin/payments/:pid/refund` — IssueRefundScreen
- `/admin/moderation` — ContentModerationScreen
- `/admin/initiatives/moderation` — InitiativeModerationScreen
- `/admin/analytics` — SubAdminAnalyticsScreen (admin sees full version; sub-admin gets revenue guard)
- `/admin/settings` — CommunitySettingsScreen
- `/admin/branding` — BrandingCustomizerScreen

### Owned backend endpoints
- All under `/api/v1/communities/:cid/admin/*` (gate: `requireCommunityRole('admin', 'subadmin')`, `blockSubAdminFromFinancial` on money ones).
- `GET /communities/:cid/admin/overview`
- `GET /communities/:cid/admin/analytics/{attendance,growth,most-active}`
- `GET /communities/:cid/admin/members/pending`
- `POST /communities/:cid/admin/members/:uid/{approve,reject}`
- `GET /communities/:cid/admin/moderation`
- `GET /communities/:cid/admin/subscriptions` (admin only)
- Plus `/communities/:cid/finances`, `/payments/:pid`, `/payments/:pid/refund` (admin only).

## Invariants
1. Admin can mutate everything community-scoped EXCEPT creating the community itself.
2. Sub-admin shares many of these screens — admin must preserve sub-admin's locked branches when editing shared files (`AdminDashboardScreen`, `AdminEventListScreen`, `EditEventScreen`, `EventForm`, `InviteMemberScreen`, `MemberDetailScreen`).
3. First-time admin with `wizardCompletedAt = null` is redirected to `/admin/wizard` by `landingPathAfterAuth`.
4. Money surface is admin-only (`wrapAdminOnly` route gate). Sub-admin → 403.

## Verification matrix
- Alice → `/admin` shows revenue card with `last30RevenueCents` + MRR.
- `/admin/events` shows price chip + "Pricing" row action for paid events.
- `/admin/events/new` form accepts `pricing.type='paid'` and persists.
- `/admin/finances` → 200 with `mrrCents`, `monthlySeries`, `recentPayments` populated.
- `/admin/subscriptions` lists subscribers; `/admin/payments/:pid/refund` triggers refund + 201.
- InviteMember chips include all 4 roles.
- MemberDetail role picker includes all 4 roles.

## How to debug
1. Login Alice and walk each tile from `/admin`.
2. Confirm money values appear (₪ amounts, MRR).
3. Confirm subscription list populates (Mike was auto-subscribed by demoReset).
4. Confirm role chips show all 4 levels.
5. If `/admin/wizard` triggers unexpectedly, check `community.onboarding.wizardCompletedAt` in MongoDB — demoReset sets it to now.
