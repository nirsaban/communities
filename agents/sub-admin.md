# Sub-Admin agent

## Persona
**Sam** is the community's deputy moderator. The trusted volunteer / co-organiser that a Community Admin hands the day-to-day keys to. Per PRD 05 §1–§2, the job is members + content + events + announcements. Per PRD 02 §3.3 + PRD 05 §3, **Sub-Admin is money-blind** — never sees revenue, prices, refunds, subscription lists. Backend enforces via `blockSubAdminFromFinancial`. Web mirrors via `wrapAdminOnly` + per-screen UI conditionals.

## Login
`sam-subadmin@example.com / RolePass123!` → lands on `/admin`. Header shows **"Limited admin"** pill.

## Scope of work

### Owned screens (shared with Community Admin — sub-admin branches)
- `/admin` — AdminDashboardScreen with `isSubAdmin` branch: no Finances / Subscriptions / Roles / Settings / Branding tiles. RevenueGuardBanner replaces revenue cards.
- `/admin/members` — MemberListScreen (shared; sub-admin reads OK)
- `/admin/members/invite` — InviteMemberScreen with role chips capped at `Member + Event manager`
- `/admin/members/:uid` — MemberDetailScreen with same role-chip cap + lifetime-spend guard banner
- `/admin/members/pending` — ApprovalQueueScreen
- `/admin/events` — AdminEventListScreen with `isSubAdmin` branch: price shown as "Paid" not amount, "Pricing" row action hidden
- `/admin/events/new` — CreateEventScreen with EventForm `allowPricing=false` → locked-pricing notice. Submit forces `pricing.type='free'`.
- `/admin/events/:eid/edit` — EditEventScreen with same locked-pricing branch
- `/admin/events/:eid/managers` — AssignManagersScreen (OK)
- `/admin/moderation` — ContentModerationScreen (post quote cards, Keep/Warn/Remove)
- `/admin/analytics` — SubAdminAnalyticsScreen (revenue guard banner pinned at top; no cents anywhere)
- `/admin/initiatives/moderation` — InitiativeModerationScreen (approve / reject)

### Backend gates verified for sub-admin
- `GET /communities/:cid/admin/overview` → 200 (engagement-only KPIs)
- `GET /communities/:cid/admin/members/pending` → 200
- `GET /communities/:cid/admin/moderation` → 200
- `GET /communities/:cid/admin/analytics/*` → 200
- `GET /communities/:cid/finances` → **403**
- `GET /communities/:cid/admin/subscriptions` → **403**
- `POST /communities/:cid/admin/members/:uid/role { role: 'admin' }` → **403** (cannot promote)

## Invariants — money-blindness leak matrix
**THESE MUST ALL HOLD.** If any fails, fix it.

1. AdminDashboard: no "Finances", "Subscriptions", "Roles", "Settings", "Branding" tiles for sub-admin.
2. AdminDashboard: no revenue/MRR KPI cards.
3. AdminEventList: price shown as "Paid" pill (no amount). "Pricing" row action hidden.
4. EditEvent: pricing block locked behind notice ("As a limited admin…").
5. CreateEvent: pricing forced to free at submit time.
6. InviteMember: chip list = `[Member, Event manager]` only.
7. MemberDetail: chip list = same. Lifetime spend banner shown.
8. SubAdminAnalytics: zero cents anywhere on the page.
9. Backend: `/communities/:cid/finances` returns 403.
10. Backend: `/communities/:cid/admin/subscriptions` returns 403.
11. Backend: any role promotion to subadmin/admin returns 403.

## Verification matrix
- Sam login → `/admin` shows engagement KPIs only.
- Sam → `/admin/events` shows "Paid" pill on the seeded paid event (NOT ₪150).
- Sam → `/admin/finances` redirects to `/403`.
- Sam → `/admin/subscriptions` redirects to `/403`.
- Sam → `/admin/members/invite` shows 2 chips, not 4.
- curl probe: `GET /communities/<cid>/finances` with Sam's token → 403.

## How to debug
1. Run the verification matrix end-to-end.
2. If any leak: find the file, add an `isSubAdmin` conditional, ensure the admin branch still renders correctly.
3. Backend leaks: check `blockSubAdminFromFinancial` middleware is on the route.
