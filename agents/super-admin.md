# Super Admin agent

## Persona
**Bob** is the platform operator. NOT a member of any community. He sits above the system: provisions communities, monitors platform health, suspends/restores/deletes communities, manages global users, tunes platform settings.

## Login
`bob@example.com / BobPass123!` → lands on `/super`. `globalRole = 'superadmin'`.

## Scope of work

### Owned screens (web)
- `/super` — SuperDashboardScreen (KPIs · MRR · active users chart · activity feed)
- `/super/communities` — list with FAB "+ New"
- `/super/communities/new` — CreateCommunity (returns invite token + link)
- `/super/communities/:cid` — detail (Suspend / Restore / Delete confirmations)
- `/super/users` — global user list
- `/super/users/:uid` — detail (Disable / Enable / Promote-to-super / Force password reset)
- `/super/settings` — platform settings (Stripe key mask, maintenance, signups)
- `/super/audit` — audit log viewer
- Plus reaching `/profile` via the BottomNav for Sign out.

### Owned backend endpoints
All under `/api/v1/super/*` — gated by `requireGlobalRole('superadmin')`:
- `GET /super/stats` — communities, users, MRR, active users, active subs, 30-day login series
- `GET /super/communities` — list with filters
- `POST /super/communities` — create + admin invitation
- `GET /super/communities/:cid` — detail (with owner join)
- `PATCH /super/communities/:cid` — edit
- `POST /super/communities/:cid/suspend`
- `POST /super/communities/:cid/restore`
- `DELETE /super/communities/:cid`
- `GET /super/users` — global user list with membershipCount, topRole
- `GET /super/users/:uid` — detail with cross-tenant memberships
- `POST /super/users/:uid/disable`
- `POST /super/users/:uid/enable`
- `POST /super/users/:uid/promote`
- `POST /super/users/:uid/reset-password`
- `GET /super/audit` — recent audit log entries
- `GET /super/settings`
- `PATCH /super/settings`

## Invariants
1. Super-bypass in `requireCommunityRole` is **read-only** (GET/HEAD/OPTIONS). PRD 03 §5: Super must use `/super/*` for any mutation.
2. Audit log records every super action with actor id (`auditFromReq` resolves it).
3. Super has no community memberships in the demo seed (Bob has admin role in Acme Devs only because demoReset assigned him as bootstrap admin — most super admins do not).
4. Super sees the **dark theme** edge-to-edge via `RoleShell` applying `.dark` class when `role === 'super'`.

## Verification matrix
- `GET /super/stats` returns 200 with all kpis numeric.
- `POST /super/communities` returns 201 with `invitation.token`.
- Created community appears in `/super/communities`.
- `GET /invitations/:token` shows correct community + role=admin.
- `POST /super/communities/:cid/suspend` flips status; `/super/communities/:cid/restore` reverts.
- Member token cannot reach `/super/*` (403).
- `POST /super/users/:uid/promote` flips `globalRole=superadmin` and audits.

## How to debug
1. Login as Bob and walk every left-nav tab. Each should render real data.
2. Check the audit log shows your actions immediately.
3. Confirm Mike (member) gets 403 on every `/super/*` endpoint via curl.
4. Confirm dark theme covers the BottomNav too (no light strip at the bottom).
