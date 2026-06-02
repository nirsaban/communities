# PRD 07 — Community Members Module

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Community Members are the primary users — the people the community exists to serve. Their experience must feel modern, mobile-native, and focused on engagement.

## 2. User goals

As a Member, I want to:
- Discover what's happening in my community
- See upcoming events and RSVP easily
- Participate in discussions
- Submit ideas through Initiatives
- Watch / read content from past events
- Stay informed via notifications

## 3. Member journey

```
Join community → onboarding → home feed → engage with events
                                       ├── RSVP / pay
                                       ├── discuss
                                       ├── propose initiatives
                                       └── consume content
```

## 4. Core features

### 4.1 Home feed
- Latest announcements from community
- Upcoming events
- Recent initiatives
- Pinned posts
- Personalized order (events I might like, ideas in topics I follow)

### 4.2 Events browsing
- List view: upcoming, past, all
- Filter by category, free/paid, day
- Calendar view (month + agenda)
- Event detail page with full description, schedule, speakers, location/link

### 4.3 RSVP flow
- Tap "RSVP" → confirm attendance
- If event is paid → checkout flow (see PRD 09)
- If event is full → join waitlist
- Add to calendar (iOS / Android native calendar)
- Receive reminders (24h before, 1h before)

### 4.4 Discussions
- Each community has a discussion area
- Threaded comments
- Reactions (like, etc.)
- Mentions (@user) trigger notifications
- Reporting / flagging inappropriate content

### 4.5 Initiatives
See PRD 11 for full spec. Brief: members propose ideas, others can join, comment, support.

### 4.6 Event content consumption
- Browse past events I attended
- View materials (slides, recordings, summaries)
- Ask questions in event Q&A
- Rate / review events

### 4.7 Profile
- Photo, name, bio
- Interests / tags
- Communities I belong to
- My RSVPs (upcoming + past)
- My initiatives
- My subscriptions
- Notification preferences

## 5. Screens (Flutter)

Bottom navigation: Home · Events · Initiatives · Inbox · Profile

| Screen | Purpose |
|---|---|
| `/home` | Personalized feed |
| `/events` | Event list + filters |
| `/events/:id` | Event detail + RSVP |
| `/initiatives` | Initiative list |
| `/initiatives/:id` | Initiative detail |
| `/initiatives/new` | Propose new initiative |
| `/inbox` | Notifications + messages |
| `/profile` | My profile + settings |
| `/communities` | Switch community (if member of multiple) |

## 6. API endpoints

| Method | Path | Description |
|---|---|---|
| GET | /me/feed | Personalized home feed |
| GET | /communities/:cid/events | List events for community |
| GET | /events/:eid | Event detail |
| POST | /events/:eid/rsvp | RSVP to event |
| DELETE | /events/:eid/rsvp | Cancel RSVP |
| GET | /events/:eid/materials | Materials (if attended) |
| POST | /events/:eid/qa | Ask a question |
| GET | /communities/:cid/posts | Discussion posts |
| POST | /communities/:cid/posts | Create post |
| GET | /me/profile | My profile |
| PATCH | /me/profile | Update profile |
| GET | /me/rsvps | My upcoming RSVPs |

## 7. Member experience principles

- Speed: every screen must load in <1.5s on 3G
- Clarity: no admin/staff UI ever visible
- Empty states: every list has a thoughtful empty state with a clear next action
- Gestures: pull to refresh on feed and events
- Offline: cached feed and event details are viewable offline

## 8. Multi-community support

A user can belong to multiple communities. The app handles this with a community switcher in the top bar (or profile). All content (feed, events, initiatives) is scoped to the currently active community.

## 9. Notifications

| Trigger | Channel |
|---|---|
| New event published | Push (opt-in) |
| Event reminder (24h, 1h before) | Push |
| Mention in discussion | Push + inbox |
| Reply to my question | Push + inbox |
| Initiative I follow updated | Push + inbox |
| Welcome message from community | Inbox |

See PRD 15 for full notification spec.

## 10. Acceptance criteria

- A new member completes onboarding and lands on the home feed
- A member can RSVP to a free event in 2 taps
- A member who RSVPs a paid event is taken to checkout
- A member can switch between communities they belong to without logging out
- A member never sees admin-only UI or actions
- Push notifications work on both iOS and Android
- A member can view materials from events they attended but not from events they skipped (unless event is marked open)

## 11. Out of scope (v1)

- Direct messaging between members (planned v1.5)
- Member-to-member friend / follow system
- In-app video calls
- Stories / ephemeral content
