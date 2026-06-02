# PRD 03 — Super Admin Module

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

The Super Admin is the platform operator. They have global visibility and the authority to create new communities and bootstrap them with an initial Community Admin.

## 2. User goals

As a Super Admin, I want to:
- Onboard new communities to the platform
- Assign an initial admin to each new community
- Monitor health and activity across all communities
- Suspend or delete misbehaving communities
- View platform-wide financial and usage data

## 3. Features

### 3.1 Community management
- Create a new community
- Edit any community's metadata
- Suspend / unsuspend community
- Delete community (soft delete with 30-day retention)
- View list of all communities with search and filter

### 3.2 Initial admin creation
- When creating a community, Super Admin specifies the initial admin's email
- System sends invitation email with a one-time signup link
- On signup, the new user is automatically assigned `admin` role for that community

### 3.3 Platform monitoring
- Dashboard with key metrics:
  - Total communities (active / suspended)
  - Total users
  - Total events (this month)
  - Total revenue (this month, all communities)
  - Active subscriptions
- Recent activity feed (new communities, suspicious activity)

### 3.4 User management (global)
- View any user across the platform
- Force password reset
- Disable account
- Promote another user to Super Admin (requires confirmation)

### 3.5 System settings
- Platform-wide Stripe keys
- Default community templates
- Maintenance mode toggle
- Email template editing (welcome, password reset)

## 4. Screens (Flutter)

| Screen | Purpose |
|---|---|
| `/super/dashboard` | Platform overview with metrics |
| `/super/communities` | List, search, filter all communities |
| `/super/communities/new` | Create community wizard |
| `/super/communities/:id` | Community detail + actions |
| `/super/users` | Global user list |
| `/super/users/:id` | User detail + actions |
| `/super/settings` | Platform settings |

## 5. API endpoints

| Method | Path | Description |
|---|---|---|
| GET | /super/dashboard | Platform metrics |
| GET | /super/communities | List communities with pagination |
| POST | /super/communities | Create new community + initial admin |
| GET | /super/communities/:id | Community detail |
| PATCH | /super/communities/:id | Edit community |
| POST | /super/communities/:id/suspend | Suspend community |
| POST | /super/communities/:id/restore | Restore suspended community |
| DELETE | /super/communities/:id | Soft delete community |
| GET | /super/users | Global user list |
| GET | /super/users/:id | User detail |
| POST | /super/users/:id/disable | Disable user account |
| POST | /super/users/:id/promote | Promote to Super Admin |

All endpoints require middleware: `verifyToken` + `requireGlobalRole('superadmin')`

## 6. Data model touchpoints

- `users.globalRole` field (`'superadmin' | 'user'`)
- `communities.status` field (`'active' | 'suspended' | 'deleted'`)
- `communities.createdBy` references the Super Admin who created it
- Audit log collection records all Super Admin actions

## 7. Audit logging

Every Super Admin action writes a record to `auditLogs`:
```
{
  actorId,
  actorRole: 'superadmin',
  action,            // e.g. 'community.suspend'
  targetType,        // 'community', 'user'
  targetId,
  metadata,
  ipAddress,
  createdAt
}
```

## 8. Acceptance criteria

- Super Admin can create a community and the initial admin receives an invitation email
- Super Admin can suspend a community, after which all its members lose access
- Super Admin cannot accidentally delete a community (requires typed confirmation)
- All Super Admin actions appear in the audit log
- A non-Super Admin user calling any `/super/*` endpoint receives 403

## 9. Out of scope (v1)

- White-labeling per community
- Custom domains per community
- Per-community billing (handled at platform level for now)
- Reseller / agency tiers
