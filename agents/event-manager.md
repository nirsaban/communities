# Event Manager agent

## Persona
**Eve** is a community member who has been assigned to run ONE specific event. PRD 06 §4: per-event grant via `Event.managers[]` alone — NOT a community-wide role. Her manager powers are scoped to events where her userId is in `event.managers[]`. She retains full member surface in the community for everything else.

## Login
`eve-em@example.com / RolePass123!` → lands on `/manage/events`. demoReset assigns her to one upcoming event so the screen has data.

## Scope of work

### Owned screens (`web/src/features/eventManager/**`)
- `/manage/events` — EventManagerHomeScreen (Upcoming / Past seg + list)
- `/events/:eid/command` — EventCommandCenterScreen (cover + CheckIn KPIs + 2×2 ActionTileGrid + Broadcast CTA)
- `/events/:eid/attendees` — AttendeeListScreen (search + 4-tab seg + check-in)
- `/events/:eid/broadcast` — BroadcastScreen (message + channels + schedule)
- `/events/:eid/materials/upload` — MaterialsUploadScreen (file drop + progress)
- `/events/:eid/recap/publish` — PublishRecapScreen (attendance + photo grid + notify)
- `/events/:eid/qa` (manager mode) — EventQAScreen manager branch (answer composer + pin + resolve)

### Backend
- `requireEventManager` middleware on each manager endpoint checks `Event.managers[].includes(userId)` alone (no Membership.role precondition per PRD 06 §4).
- `GET /me/managed-events?bucket=upcoming|past` — Eve's own list
- `GET /events/:eid/rsvps` — attendees with `attendedAt`, `waitlistPosition`
- `POST /events/:eid/rsvps/:rid/checkin` — single check-in
- `POST /events/:eid/rsvps/checkin-all`
- `POST /events/:eid/broadcast` — accepts `message`, `channels: ['push'|'inApp'|'email']`, optional `scheduleAt`
- `POST /events/:eid/materials` — multipart upload
- `POST /events/:eid/recap` — publish summary
- Q&A: `POST /events/:eid/qa/:qid/answer`, `pin`, `resolve`

## Invariants
1. Per-event grant: Eve cannot reach any other event's command center. `EventManagerGate` (`wrapEM` in routes.tsx) redirects to `/403` when `viewer.isManager` is false.
2. EventQAScreen is shared with members — manager branch shows answer/pin/resolve only when `ev.isManager === true`. Member ask-composer + upvote gated behind RSVP=going.
3. AssignManagersScreen (admin-owned) writes to `Event.managers[]`. Adding Eve there should immediately give her command access (no Membership flip needed).
4. Eve's BottomNav set: Managing · Home · Events · Inbox · Profile.

## Verification matrix
- Eve → `/manage/events` shows her seeded event ("Monthly chat with founders" or whatever demoReset wrote).
- Eve → `/events/<her-eid>/command` → full 2×2 tile grid.
- Mike → same URL → `/403`.
- Eve → `/events/<her-eid>/attendees` → 200 with attendee rows.
- Eve → check-in toggle persists.
- Eve → broadcast → 201 with `{ delivered, channels, scheduledFor }`.
- Eve → publish recap with photo URLs → summary saved.
- Eve still sees member chrome on `/home` (she's a community member too).

## How to debug
1. Login Eve, walk every manager tile.
2. Verify the per-event scoping: Mike must get 403 on Eve's event command path.
3. If a manager endpoint returns 401/403 for Eve, check her userId is in `event.managers[]` (demoReset adds it; if missing, re-run reset).
4. If a member endpoint behaves wrong for Eve, remember she still has member surface — don't break it.
