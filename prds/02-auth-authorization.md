# PRD 02 — Authentication & Authorization

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Defines how users authenticate, how tokens are managed, how roles map to permissions, and how the system enforces tenant isolation across the 5 roles.

## 2. Authentication

### 2.1 Methods (v1)
- Email + password (primary)
- Optional: Google sign-in (Phase 2)
- Optional: Apple sign-in (required for iOS App Store, Phase 2)

### 2.2 Token strategy

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access token | 15 minutes | Flutter Secure Storage | Authenticate API requests |
| Refresh token | 30 days | Flutter Secure Storage | Obtain new access tokens |

- Tokens are JWTs signed with HS256
- Refresh tokens are stored hashed in MongoDB and revocable
- Access token payload: `{ userId, globalRole, iat, exp }`
- Refresh token payload: `{ userId, tokenId, iat, exp }`

### 2.3 Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | /auth/register | Create new user account |
| POST | /auth/login | Email + password, returns tokens |
| POST | /auth/refresh | Exchange refresh for new access token |
| POST | /auth/logout | Revoke refresh token |
| POST | /auth/forgot-password | Send reset email |
| POST | /auth/reset-password | Use token from email to set new password |
| GET | /auth/me | Current user profile + memberships |

### 2.4 Password policy
- Minimum 8 characters, at least 1 letter and 1 number
- bcryptjs with cost factor 12
- Rate limit: 5 failed attempts per 15 minutes per IP+email

## 3. Authorization model

### 3.1 Role hierarchy

```
Super Admin (global)
    │
    ├── Community Admin (per-community)
    │       │
    │       ├── Sub Admin (per-community, no financial)
    │       │
    │       └── Event Manager (per-event)
    │
    └── Community Member (per-community)
```

### 3.2 Role definitions

| Role | Scope | Key permissions |
|---|---|---|
| Super Admin | Platform-wide | Create communities, manage all data |
| Community Admin | Per community | Full control over their community |
| Sub Admin | Per community | All admin powers except payments/financial |
| Event Manager | Per event(s) | Manage assigned events only |
| Member | Per community | Read content, RSVP, participate |

### 3.3 Permission matrix

| Action | Super | Admin | Sub Admin | Event Mgr | Member |
|---|---|---|---|---|---|
| Create community | ✓ | – | – | – | – |
| Edit community settings | ✓ | ✓ | – | – | – |
| Manage members | ✓ | ✓ | ✓ | – | – |
| Assign roles | ✓ | ✓ | partial | – | – |
| Create event | ✓ | ✓ | ✓ | – | – |
| Manage assigned event | ✓ | ✓ | ✓ | ✓ | – |
| View financial dashboard | ✓ | ✓ | – | – | – |
| Manage payments | ✓ | ✓ | – | – | – |
| Moderate content | ✓ | ✓ | ✓ | – | – |
| RSVP to event | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create initiative | ✓ | ✓ | ✓ | ✓ | ✓ |
| Comment on posts | ✓ | ✓ | ✓ | ✓ | ✓ |

## 4. Middleware design (Express)

```
verifyToken         → decodes JWT, attaches req.user
loadMembership      → for community-scoped routes, loads req.membership
requireGlobalRole   → e.g. requireGlobalRole('superadmin')
requireCommunityRole → e.g. requireCommunityRole(['admin','subadmin'])
requireEventManager → checks event.managers includes req.user._id
blockSubAdminFromFinancial → explicit guard on payment routes
```

## 5. Flutter integration

### 5.1 Auth flow

```
App start → check stored tokens
    ├── valid access → fetch /auth/me → home
    ├── expired access + valid refresh → refresh → home
    └── no tokens → login screen
```

### 5.2 Dio interceptor
- Attaches `Authorization: Bearer <accessToken>` to every request
- On 401 response: tries refresh once; on failure, logs out

### 5.3 Route guards (go_router)
- Public routes: login, register, forgot-password
- Authenticated routes: everything else
- Role-gated routes: admin screens hidden from non-admins

## 6. Super Admin bootstrap

Super Admin is not created via signup. It is seeded via a CLI script or env-driven first-run process:

```bash
node scripts/createSuperAdmin.js --email=... --password=...
```

The script sets `user.globalRole = 'superadmin'`. Only one Super Admin can exist initially; additional ones must be created by an existing Super Admin.

## 7. Security considerations

- HTTPS-only in production
- Refresh tokens rotated on every use (one-time-use)
- Account lockout after 10 failed logins in 1 hour
- All sensitive endpoints rate-limited via express-rate-limit
- JWT secret rotated via env variable; supports key rotation window

## 8. Open questions

- Should Sub Admins be able to assign Event Manager role? — proposed yes, scoped to their community only
- Two-factor auth for Super Admin? — Phase 2

## 9. Acceptance criteria

- A new user can register, log in, and access their dashboard
- An invalid or expired token returns 401
- A Sub Admin attempting to access `/api/v1/payments/*` returns 403
- A user from Community A cannot read or modify any document from Community B
- Logout invalidates the refresh token server-side
