# PRD 11 — Initiatives Section

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

The Initiatives section is a dedicated space within each community where members can propose ideas, start projects, recruit collaborators, and discuss execution. It turns passive members into active contributors.

## 2. User goals

As a Member, I want to:
- Propose an idea or project to my community
- Find and support ideas I care about
- Collaborate with other members on initiatives
- See progress over time

## 3. Concept

An Initiative is a member-proposed project — anything from "Let's organize a hackathon" to "Start a weekly book club" to "Volunteer at the local shelter."

## 4. Lifecycle

```
draft → submitted → under_review → approved → active → completed
                                        │
                                        └── rejected
```

- `draft`: member is still writing it
- `submitted`: ready for review
- `under_review`: admin / sub admin is reviewing
- `approved`: visible to community, can recruit supporters
- `active`: has supporters / contributors, in execution
- `completed`: marked done by initiator or admin
- `rejected`: declined with optional reason

## 5. Core data fields

| Field | Type | Notes |
|---|---|---|
| title | string | Required, max 200 chars |
| description | string | Rich text, max 5,000 chars |
| communityId | ObjectId | Required |
| authorId | ObjectId | Initiator |
| category | string | e.g., 'event', 'volunteer', 'product', 'social', 'other' |
| status | enum | See lifecycle |
| coverImage | string | Optional |
| supporters | ObjectId[] | Users supporting / joining |
| contributors | ObjectId[] | Active collaborators |
| comments | embedded | See below |
| supporterCount | number | Cached counter |
| commentCount | number | Cached counter |
| targetDate | Date | Optional goal date |
| createdAt, updatedAt | Date | |
| reviewedBy | ObjectId | Admin / sub admin who reviewed |
| rejectionReason | string | If rejected |

## 6. Features

### 6.1 Propose an initiative
- Member taps "New initiative" in Initiatives tab
- Form: title, description, category, target date, cover image (optional)
- Save as draft or submit for review
- Editable while in draft

### 6.2 Review by admin / sub admin
- Pending initiatives appear in admin moderation queue
- Admin can approve, reject (with reason), or request changes
- Approval makes initiative visible to all community members
- Notifications sent to initiator on status change

### 6.3 Support
- Members tap "I'm in" to support
- Different from contributing — supporters are interested, contributors are committing time
- Counter visible publicly

### 6.4 Contribute
- Author can promote supporters to contributors
- Contributors can post updates on the initiative
- Contributors get a "Contributor" badge on their profile

### 6.5 Discussion
- Each initiative has a comment thread
- Threaded comments (1 level deep)
- Reactions on comments
- Mentions trigger notifications

### 6.6 Updates
- Author or contributors post progress updates
- Updates are first-class content (not just comments)
- Followers / supporters get notified

### 6.7 Completion
- Initiator marks as complete with a summary
- Optional: convert to a community event (e.g., the initiative becomes the first event)

## 7. Screens (Flutter)

| Screen | Purpose |
|---|---|
| `/initiatives` | List of initiatives in current community |
| `/initiatives/new` | Propose new initiative |
| `/initiatives/:id` | Initiative detail + comments + supporters |
| `/initiatives/:id/edit` | Edit (author or admin) |
| `/admin/initiatives` | Moderation queue (admin / sub admin) |

## 8. List sorting / filtering

Default sort: trending (combination of recent activity + supporter count)
Filters:
- Status: active, completed, all
- Category
- My initiatives (authored)
- Initiatives I support

## 9. API endpoints

| Method | Path | Description |
|---|---|---|
| GET | /communities/:cid/initiatives | List with filters |
| POST | /communities/:cid/initiatives | Create draft |
| GET | /initiatives/:id | Get initiative |
| PATCH | /initiatives/:id | Update (author or admin) |
| DELETE | /initiatives/:id | Delete (author or admin) |
| POST | /initiatives/:id/submit | Submit for review |
| POST | /initiatives/:id/approve | Approve (admin/sub admin) |
| POST | /initiatives/:id/reject | Reject (admin/sub admin) |
| POST | /initiatives/:id/support | Add support |
| DELETE | /initiatives/:id/support | Remove support |
| POST | /initiatives/:id/contributors | Add contributor |
| GET | /initiatives/:id/comments | List comments |
| POST | /initiatives/:id/comments | Add comment |
| POST | /initiatives/:id/updates | Post update (author/contributor only) |
| POST | /initiatives/:id/complete | Mark complete |

## 10. Moderation

- Admin / Sub Admin can:
  - Approve / reject initiatives
  - Hide individual comments
  - Lock comments
  - Archive completed initiatives
- Users can flag inappropriate content
- Flagged content appears in moderation queue

## 11. Acceptance criteria

- Member can create an initiative draft and finish later
- Admin moderation queue shows new initiatives within seconds of submission
- A rejected initiative is visible only to its author and admins, with the rejection reason shown
- An approved initiative is visible to all community members within the Initiatives tab
- Supporter count updates in real time (or near real time, polling acceptable)
- Initiative status changes notify the author via push
- Mentions in comments trigger notifications

## 12. Out of scope (v1)

- Initiative budget tracking
- Initiative-internal payments
- File attachments on initiatives (Phase 2 — currently just cover image)
- Voting / polling within initiatives
- Initiative milestones / checklists
