# PRD 06 — Event Manager Module

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Event Managers are responsible for individual events. They are scoped per-event (one user can manage multiple events). They focus on running an event well: communicating with attendees, uploading recordings, answering questions, and publishing summaries.

## 2. User goals

As an Event Manager, I want to:
- See the events I'm assigned to manage
- Communicate with attendees before, during, and after the event
- Upload materials and recordings after the event
- Answer questions from attendees
- Publish summaries and follow-up content

## 3. Permissions

### Can do (for assigned events only)
- View attendee list (names + RSVP status, no payment info)
- Send messages to attendees (push + in-app)
- Upload event materials (slides, recordings, documents)
- Publish event summary
- Create Q&A threads tied to the event
- Mark attendance (manual override)
- Reply to attendee questions

### Cannot do
- Edit event title, date, pricing, or location
- Cancel the event
- Refund payments
- View revenue from the event
- Access events they aren't assigned to
- Manage members outside the event
- See financial info

## 4. Multi-event assignment

A single user can be assigned as Event Manager to multiple events. Each event has its own `managers` array (list of userIds). Different events can have completely different managers.

## 5. Screens (Flutter)

| Screen | Purpose |
|---|---|
| `/manager/events` | List of events I manage |
| `/manager/events/:id` | Event command center |
| `/manager/events/:id/attendees` | Attendee list |
| `/manager/events/:id/materials` | Upload materials |
| `/manager/events/:id/qa` | Q&A thread |
| `/manager/events/:id/summary` | Publish summary |
| `/manager/events/:id/messages` | Broadcast to attendees |

Event Managers see a dedicated "Events I manage" tab in the bottom navigation. They still see the regular member tabs for the rest of their community.

## 6. API endpoints

| Method | Path | Description |
|---|---|---|
| GET | /me/managed-events | List events I manage |
| GET | /events/:eid/attendees | Attendee list (manager view) |
| POST | /events/:eid/broadcast | Send message to all attendees |
| POST | /events/:eid/materials | Upload material |
| GET | /events/:eid/materials | List materials |
| POST | /events/:eid/qa | Post question or answer |
| GET | /events/:eid/qa | List Q&A thread |
| POST | /events/:eid/summary | Publish summary |
| POST | /events/:eid/attendance | Mark attendance |

All require: `verifyToken` + `requireEventManager` middleware which checks `event.managers.includes(req.user._id)`.

## 7. Materials

Materials are media or document files attached to a post-event archive:
- File types: PDF, MP4, MP3, images, slide files (.pptx, .pdf)
- Storage: Cloudinary or S3
- Max file size: 500MB
- Each material has: title, description, file URL, uploadedAt, uploaderId
- Members of the community can view materials if:
  - They attended (RSVP'd) the event, or
  - The event has been marked "open to all members" by the Admin

## 8. Q&A thread

Each event has a Q&A thread:
- Members ask questions related to the event
- Event Managers (and Admins/Sub Admins) can answer
- Other members can upvote questions
- Answered questions get pinned to the top

## 9. Broadcast messages

Event Manager can send a single broadcast to all RSVP'd attendees:
- Sent as push notification + in-app message
- Rate limit: 5 broadcasts per event maximum
- Optional schedule (send in X hours)

## 10. Acceptance criteria

- An Event Manager logs in and sees a dedicated "Events I manage" tab
- Event Manager can upload a PDF and it appears for attendees within 30 seconds
- Event Manager cannot edit event date, title, or price (UI buttons are hidden, API returns 403)
- Event Manager cannot see other events in the community that they aren't assigned to
- Event Manager cannot see revenue or payment data
- Attendees receive a push notification when the Event Manager broadcasts

## 11. Out of scope (v1)

- Live event check-in via QR code (planned v1.5)
- In-event chat during a session
- Live streaming integration
- Auto-transcription of recordings (Phase 2)
