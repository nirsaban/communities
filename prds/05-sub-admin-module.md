# PRD 05 — Sub Admin Module

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Sub Admins are delegated staff who can do nearly everything a Community Admin can — except touch financial or payment-related data. They are typically community moderators, volunteers, or co-organizers.

## 2. User goals

As a Sub Admin, I want to:
- Help manage members and content without seeing payment info
- Create and run events
- Moderate discussions
- Approve new member applications
- Assign Event Managers when needed

## 3. Permissions overview

### Can do
- Manage members (invite, approve, remove)
- Assign Event Manager role (limited to their community)
- Create / edit / cancel events (non-paid events freely; paid events flagged for Admin approval)
- Moderate content (posts, comments, initiatives)
- Send announcements
- View attendance and engagement metrics

### Cannot do
- View financial dashboard
- Configure payment settings
- Manage subscriptions
- Edit community billing/payout info
- Promote another user to Sub Admin or Admin
- Edit community settings (privacy, branding)
- Access analytics that include revenue data

## 4. Feature differences vs Community Admin

| Feature | Admin | Sub Admin |
|---|---|---|
| Member management | Full | Full |
| Role assignment | Any role | Event Manager only |
| Event creation (free) | ✓ | ✓ |
| Event creation (paid) | ✓ | Read-only (must request Admin) |
| Edit pricing | ✓ | – |
| Financial dashboard | ✓ | Hidden from UI + blocked by API |
| Community settings | ✓ | – |
| Analytics (non-financial) | ✓ | ✓ |
| Analytics (financial) | ✓ | – |

## 5. Screens (Flutter)

| Screen | Purpose |
|---|---|
| `/admin/dashboard` | Community overview (financial widgets hidden) |
| `/admin/members` | Full member management |
| `/admin/events` | Event list and create |
| `/admin/content` | Post moderation |
| `/admin/initiatives` | Initiative moderation |
| `/admin/analytics` | Non-financial analytics only |

Financial screens (`/admin/finances`, `/admin/settings`) are not rendered for Sub Admins. The bottom navigation hides them entirely.

## 6. API enforcement

A dedicated middleware blocks Sub Admins from financial endpoints:

```js
function blockSubAdminFromFinancial(req, res, next) {
  if (req.membership.role === 'subadmin') {
    return res.status(403).json({ error: 'Sub Admins cannot access financial data' });
  }
  next();
}
```

Applied to all routes under:
- `/communities/:cid/finances/*`
- `/communities/:cid/payments/*`
- `/communities/:cid/subscriptions/*`
- `/communities/:cid/settings/billing/*`

For event creation, paid events require an extra check:
```js
if (req.body.priceCents > 0 && req.membership.role === 'subadmin') {
  return res.status(403).json({ error: 'Sub Admins cannot create paid events' });
}
```

## 7. Audit logging

All Sub Admin actions are logged identically to Admin actions, with `actorRole: 'subadmin'`. This lets Admins review what their Sub Admins have done.

## 8. UX considerations

- When a Sub Admin views a member's profile, do not show financial info (e.g., "lifetime spend")
- When viewing an event, hide revenue but show attendance
- A small "Limited admin" badge near profile picture in admin UI to remind the user of their role

## 9. Acceptance criteria

- A Sub Admin logging in sees the admin dashboard with no financial widgets
- A Sub Admin cannot navigate to financial screens (route guards block them)
- A Sub Admin calling any financial API endpoint receives 403
- A Sub Admin can create a free event but cannot set a price on it
- A Sub Admin can assign an Event Manager to an event
- A Sub Admin cannot promote a member to Admin or Sub Admin
- All Sub Admin actions appear in the community audit log

## 10. Open questions

- Should Sub Admins see refund counts (without amounts)? Proposed: yes, just counts
- Should Sub Admins be able to issue free promo codes? Proposed: no in v1, defer
