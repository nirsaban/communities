# PRD 15 — Notifications

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Notifications keep users informed and engaged. The system supports push notifications (FCM), in-app inbox, and email (limited use). Per-user and per-channel preferences are respected.

## 2. Notification types

| Type | Channel | Audience | Trigger |
|---|---|---|---|
| `auth.welcome` | Email | New user | Account creation |
| `auth.password_reset` | Email | User | Forgot password request |
| `community.invitation` | Email + push | Invitee | Admin invites user |
| `community.application_approved` | Push + inbox | Applicant | Admin approves |
| `community.application_rejected` | Inbox + email | Applicant | Admin rejects |
| `community.role_changed` | Push + inbox | User | Role updated |
| `community.welcome` | Inbox | New member | Joined community |
| `event.published` | Push (opt-in) | Members | New event created |
| `event.reminder_24h` | Push | RSVP'd users | 24h before start |
| `event.reminder_1h` | Push | RSVP'd users | 1h before start |
| `event.reminder_10min` | Push | RSVP'd users (online events) | 10min before start |
| `event.cancelled` | Push + email | RSVP'd users | Event cancelled |
| `event.time_changed` | Push + email | RSVP'd users | Start time changes |
| `event.materials_uploaded` | Push + inbox | RSVP'd users | New materials |
| `event.summary_published` | Push + inbox | RSVP'd users | Summary published |
| `event.broadcast` | Push + inbox | RSVP'd users | Manager broadcast |
| `event.waitlist_promoted` | Push + email | Waitlist user | Seat opened up |
| `payment.succeeded` | Push + email | Payer | Payment confirmed |
| `payment.failed` | Push + email | Payer | Payment failed |
| `payment.refunded` | Push + email | Payer | Refund processed |
| `subscription.renewed` | Inbox | Subscriber | Renewal succeeded |
| `subscription.payment_failed` | Push + email | Subscriber | Renewal failed |
| `subscription.cancelled` | Email | Subscriber | Sub cancelled |
| `initiative.approved` | Push + inbox | Author | Initiative approved |
| `initiative.rejected` | Push + inbox | Author | Initiative rejected |
| `initiative.new_supporter` | Inbox | Author | Someone supports |
| `initiative.update_posted` | Push (opt-in) | Supporters | Update posted |
| `comment.reply` | Push + inbox | Parent commenter | Reply to your comment |
| `mention.comment` | Push + inbox | Mentioned user | @ mention |
| `mention.post` | Push + inbox | Mentioned user | @ mention |
| `admin.moderation_queue` | Inbox | Admin | New flagged content |

## 3. Channels

### 3.1 Push (FCM)
- Primary channel for time-sensitive notifications
- Configured per platform (iOS / Android)
- Topic-based subscription for community-wide announcements
- Direct user-targeted for personal notifications

### 3.2 In-app inbox
- Persistent list of notifications in the app
- Unread count badge on inbox tab
- Tap → opens deep link to relevant content
- Notifications older than 90 days are archived

### 3.3 Email
- Used for: high-importance transactional, security, payments
- Templates managed centrally
- Sent via SendGrid / Postmark / AWS SES (TBD)
- Unsubscribe links comply with CAN-SPAM / GDPR

## 4. User preferences

User can configure per-notification-type, per-channel:

```
notifications: {
  events: {
    newEvent: { push: true, email: false },
    reminders: { push: true, email: false },
    changes: { push: true, email: true }
  },
  community: { ... },
  payments: { ... },        // payments always on for legal reasons
  mentions: { ... },
  initiatives: { ... }
}
```

UI: `/profile/notifications` screen with grouped toggles.

Defaults are sensible: time-sensitive on, marketing-like opt-in.

## 5. Quiet hours

Users can set quiet hours (e.g., 10pm–7am local time):
- Push notifications during quiet hours are deferred to morning
- Time-critical (event starting in <1h) override quiet hours
- Configured in `/profile/notifications`

## 6. Architecture

```
Event in system (e.g., event published)
  → controller publishes to notification service
  → notification service:
       1. Determines audience (memberships, RSVPs, etc.)
       2. Checks each user's preferences
       3. Checks quiet hours
       4. Writes notification document
       5. Dispatches push via FCM
       6. Sends email via provider (if applicable)
```

Async via job queue (Bull or built-in node-cron + Mongo) to avoid blocking the API request.

## 7. FCM device management

- User logs in → app obtains FCM token → registers via `POST /me/devices`
- App stores token; re-registers if token rotates
- On logout, deletes device from server
- Server tracks tokens per user; sends pushes to all active tokens
- Failed sends (NotRegistered, InvalidRegistration) trigger token cleanup

## 8. Email templates

Use a templating system (Handlebars or React Email):
- One template per notification type
- Includes:
  - Header: community / app logo
  - Body: contextual content
  - CTA button: deep link to relevant content in app
  - Footer: unsubscribe + legal
- Templates support multiple languages

## 9. Rate limiting

- Per-user: max 50 push notifications per day (excludes auth, payment critical)
- Per-community broadcast: max 5 per event
- Anti-spam: dedupe within 5 min window

## 10. Acceptance criteria

- A user RSVPs to an event → receives reminders at 24h/1h before start
- Reminders respect quiet hours (deferred to morning if applicable)
- User can disable a specific notification type and stop receiving it
- User receives reply notifications on comments
- A failed FCM token is automatically cleaned up
- Email notifications include working unsubscribe links
- Push notification taps open the correct in-app deep link

## 11. Localization

All notification text is localized:
- Push title + body
- Email subject + body
- In-app inbox text

Selected based on user's language preference, defaulting to English.

## 12. Out of scope (v1)

- SMS notifications
- WhatsApp notifications (despite RTL Hebrew user base — Phase 2)
- Webhook notifications to external systems
- Slack / Discord integration
- AI-summarized digests
