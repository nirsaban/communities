# Implementation Progress

Live record of what's been built, deviations from the PRDs, and what's next.

---

## Phases complete

### P0 — Foundations ✅
### P1 — Backend skeleton + auth ✅ (TypeScript)
### P2 — Multi-tenant + roles ✅
### P3 — Events MVP ✅ (one-time only — recurring added in P5)
### P4 — Payments ✅ (Stripe + webhooks + finances dashboard)
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
