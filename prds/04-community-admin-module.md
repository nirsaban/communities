# PRD 04 — Community Admin Module

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

The Community Admin is the primary owner of a community. They handle the entire lifecycle: setup, members, events, content, monetization, and analytics for their community.

## 2. User goals

As a Community Admin, I want to:
- Set up my community after I'm invited
- Define what my community is about
- Invite and manage members
- Assign Sub Admins and Event Managers
- Create and manage events
- Configure payment options
- See how my community is performing

## 3. Features

### 3.1 Community onboarding wizard
Triggered on first login after invitation. Steps:
1. Community name (pre-filled from Super Admin)
2. Community description (1-2 sentences)
3. Community purpose / category (dropdown: religious, educational, professional, hobby, other)
4. Logo / cover image upload
5. Privacy: public, invite-only, application-required
6. Default member permissions
7. Welcome message shown to new members

### 3.2 Member management
- List members with search, filter by role, sort
- Invite members (single email or bulk CSV upload)
- Approve / reject member applications
- Change member's role
- Remove member from community
- View member's activity history

### 3.3 Role assignment
- Promote member to Sub Admin
- Assign Event Manager to specific event(s)
- Demote staff back to member
- Revoke roles immediately

### 3.4 Content management
- Create / edit announcements
- Pin posts to community feed
- Moderate user-generated content
- Delete posts / comments
- Configure community rules and guidelines

### 3.5 Event management
- Create new event (one-time or recurring)
- Edit existing event
- Cancel event
- View event RSVPs
- Assign Event Managers
- Configure pricing (see PRD 09)

### 3.6 Financial dashboard
- Total revenue (lifetime, this month, this week)
- Revenue by event
- Active subscriptions count
- Pending payouts
- Stripe Connect link (if community has own Stripe)
- Export transactions CSV

### 3.7 Community settings
- Update community metadata
- Privacy controls
- Notification preferences
- Branding (logo, colors)
- Danger zone: archive community

### 3.8 Analytics
- Member growth chart
- Event attendance trends
- Most active members
- Most popular events
- Engagement metrics (posts, comments, RSVPs)

## 4. Screens (Flutter)

| Screen | Purpose |
|---|---|
| `/admin/onboarding` | First-time community setup wizard |
| `/admin/dashboard` | Community overview |
| `/admin/members` | Member list and management |
| `/admin/members/:id` | Member detail |
| `/admin/events` | Event list |
| `/admin/events/new` | Create event |
| `/admin/events/:id` | Event detail + management |
| `/admin/content` | Posts, announcements |
| `/admin/finances` | Financial dashboard |
| `/admin/initiatives` | Member-submitted initiatives |
| `/admin/settings` | Community settings |
| `/admin/analytics` | Charts and reports |

## 5. API endpoints

| Method | Path | Description |
|---|---|---|
| GET | /communities/:cid/dashboard | Community overview metrics |
| PATCH | /communities/:cid | Update community settings |
| POST | /communities/:cid/onboard | Submit onboarding wizard |
| GET | /communities/:cid/members | List members |
| POST | /communities/:cid/members/invite | Invite member(s) |
| PATCH | /communities/:cid/members/:uid | Change member role |
| DELETE | /communities/:cid/members/:uid | Remove member |
| GET | /communities/:cid/events | List events |
| POST | /communities/:cid/events | Create event |
| GET | /communities/:cid/finances | Financial dashboard |
| GET | /communities/:cid/analytics | Analytics data |

All endpoints require: `verifyToken` + `requireCommunityRole(['admin'])`

## 6. Data model touchpoints

- `communities` — name, description, category, settings, branding
- `memberships` — userId, communityId, role, joinedAt
- `events` — full event data (see PRD 08)
- `posts` — community feed content
- `payments` — transactions (read-only for analytics)

## 7. Email triggers

| Event | Recipient | Template |
|---|---|---|
| Initial invitation | New community admin | invite-admin |
| Member invited | New member | invite-member |
| Application approved | Applicant | application-approved |
| Member removed | Removed user | removed-from-community |
| Role promotion | Promoted user | role-promoted |

## 8. Acceptance criteria

- New Community Admin completes onboarding before accessing any other admin screen
- Admin can invite a member by email and see them in pending status until they sign up
- Admin can promote a member to Sub Admin and the change is visible to that user immediately on next API call
- Admin can view total revenue and per-event breakdown
- All admin actions are scoped to their own community (cannot read/write other communities)
- An admin attempting to access another community's data via direct API call returns 403

## 9. Out of scope (v1)

- Multiple admins per community (planned for v1.5)
- Co-admins with split responsibilities
- Custom roles beyond the 5 predefined ones
- Per-admin permissions (currently all admins have identical permissions)
