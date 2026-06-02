# PRD 08 — Event System

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Events are the central object in the platform. Communities revolve around events: lectures, classes, meetups, services, workshops. The event system supports one-time and recurring events with optional payments.

## 2. Event types

### 2.1 One-time events
- Single scheduled occurrence
- Has a defined start time, end time, date
- Examples: a specific lecture, conference, panel

### 2.2 Recurring events
- Repeats on a schedule
- Patterns:
  - Daily
  - Weekly (e.g., every Tuesday 7pm)
  - Bi-weekly
  - Monthly (specific day of month or specific weekday e.g., 2nd Sunday)
  - Custom (every N days/weeks)
- End condition: never, end date, after N occurrences
- Each occurrence is materialized as a separate event instance (so RSVPs and payments are per-instance)

## 3. Event lifecycle

```
draft → published → upcoming → in_progress → completed → archived
                                                    │
                                                    └── cancelled (at any point)
```

## 4. Core data fields

| Field | Type | Notes |
|---|---|---|
| title | string | Required, max 200 chars |
| description | string | Rich text, max 10,000 chars |
| communityId | ObjectId | Required |
| type | enum | 'one_time' \| 'recurring' |
| recurrenceRule | object | Only if type = recurring (RRULE-like) |
| startAt | Date | Required |
| endAt | Date | Required |
| timezone | string | IANA tz |
| location | object | { type: 'physical' \| 'online' \| 'hybrid', address, url } |
| coverImage | string | URL |
| category | string | e.g., 'lecture', 'class', 'meetup' |
| speakers | array | [{ name, bio, photo }] |
| capacity | number | Max attendees, null = unlimited |
| status | enum | draft, published, cancelled, completed |
| pricing | object | See PRD 09 |
| managers | ObjectId[] | Event Manager user IDs |
| createdBy | ObjectId | Creator |
| visibility | enum | 'community' (all members), 'invite' (specific) |

## 5. RSVP system

### 5.1 RSVP states
- `going` — user confirmed
- `not_going` — user declined
- `maybe` — user is undecided (allowed by config)
- `waitlist` — capacity hit, user is queued

### 5.2 RSVP flow

```
User taps RSVP
  ├── Event is free + has capacity → RSVP recorded
  ├── Event is free + full → join waitlist
  ├── Event is paid + has capacity → checkout flow → on payment success, RSVP recorded
  └── Event is paid + full → join waitlist (no payment yet)
```

### 5.3 Cancellation rules
- Free event: cancel anytime
- Paid event: cancel before X hours before start (configurable per event) for refund eligibility
- Cancellation triggers waitlist promotion

## 6. Recurring event handling

### 6.1 Instance materialization
- When a recurring event is created, the system pre-generates the next N instances (default 12)
- A nightly cron job materializes upcoming instances within a 60-day window
- Each instance has its own ID, RSVPs, payments, materials

### 6.2 Editing recurring events
When editing, user chooses:
- "This occurrence only" — edits only one instance
- "This and future occurrences" — splits the series
- "All occurrences" — applies to entire series (where possible)

### 6.3 Cancellation
Same options as editing.

## 7. API endpoints

| Method | Path | Description |
|---|---|---|
| GET | /communities/:cid/events | List events with filters |
| GET | /events/:eid | Event detail |
| POST | /communities/:cid/events | Create event |
| PATCH | /events/:eid | Update event |
| POST | /events/:eid/cancel | Cancel event |
| POST | /events/:eid/duplicate | Duplicate event |
| GET | /events/:eid/rsvps | List RSVPs (admin/manager) |
| POST | /events/:eid/rsvp | RSVP |
| DELETE | /events/:eid/rsvp | Cancel RSVP |
| POST | /events/:eid/managers | Assign Event Manager |
| DELETE | /events/:eid/managers/:uid | Remove Event Manager |

## 8. Reminders

System sends automated reminders:
- 24 hours before start → push + email
- 1 hour before start → push
- 10 minutes before start (for online events with URL) → push with "Join now" CTA

Members can opt out per-event or globally.

## 9. Edge cases

| Scenario | Behavior |
|---|---|
| User RSVPs then community is suspended | RSVP preserved, user notified |
| Event time changes after RSVPs | All attendees notified via push + email |
| Event cancelled with paid RSVPs | Auto-refunds initiated, attendees notified |
| Recurring event ends earlier than planned | Future instances cancelled, attendees notified |
| Event capacity reduced below current RSVPs | Excess attendees moved to waitlist (last-in-first-out) |

## 10. Acceptance criteria

- Admin can create a recurring weekly event and 12 future instances appear in the list
- Member can RSVP to one occurrence without auto-RSVPing to all
- Member's RSVP shows in their "My upcoming RSVPs" list
- Event start-time changes trigger notification to all RSVPs within 1 minute
- Cancelled paid event auto-issues Stripe refunds
- Waitlist promotion happens within 1 minute of an RSVP cancellation

## 11. Out of scope (v1)

- Multi-session events (conference with parallel tracks)
- Ticket types (general vs VIP) — Phase 2
- Promo codes (Phase 2)
- Affiliate / referral tracking
- iCal feed export per community
