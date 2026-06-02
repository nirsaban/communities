# PRD 14 — Database Schema (MongoDB)

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Detailed MongoDB schema for all collections, with indexes, relationships, and tenant isolation enforcement.

## 2. Collections overview

| Collection | Purpose |
|---|---|
| users | Global user accounts |
| communities | Tenant registry |
| memberships | User ↔ Community ↔ Role |
| events | Event definitions and instances |
| eventRsvps | RSVP records |
| materials | Files attached to events |
| initiatives | Member-driven projects |
| posts | Community feed posts and announcements |
| comments | Comments on posts, initiatives, events |
| payments | One-time event payments |
| subscriptions | Recurring subscriptions |
| notifications | User notifications |
| devices | FCM tokens for push notifications |
| auditLogs | Action audit trail |
| refreshTokens | Hashed refresh tokens |
| invitations | Pending invitations |
| applications | Pending community membership applications |

## 3. Schema details

### 3.1 users
```js
{
  _id: ObjectId,
  email: { type: String, unique: true, lowercase: true, required: true },
  passwordHash: String,
  name: String,
  photoUrl: String,
  bio: String,
  interests: [String],
  globalRole: { type: String, enum: ['user', 'superadmin'], default: 'user' },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  emailVerifiedAt: Date,
  lastLoginAt: Date,
  onboarding: {
    appOnboardingCompletedAt: Date,
    profileCompletedAt: Date,
    interestsCompletedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { email: 1 } unique
- { globalRole: 1 }
- { status: 1 }
```

### 3.2 communities
```js
{
  _id: ObjectId,
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  description: String,
  category: { type: String, enum: ['religious','educational','professional','hobby','other'] },
  logoUrl: String,
  coverUrl: String,
  privacy: { type: String, enum: ['public','invite_only','application'], default: 'invite_only' },
  status: { type: String, enum: ['active','suspended','deleted'], default: 'active' },
  createdBy: ObjectId,                  // ref users (the super admin)
  initialAdminId: ObjectId,             // ref users
  settings: {
    branding: { primaryColor: String, accentColor: String },
    welcomeMessage: String,
    rules: String,
    defaultMemberPermissions: Object
  },
  stripeAccountId: String,              // Stripe Connect account
  onboarding: {
    wizardCompletedAt: Date,
    steps: { basics: Boolean, branding: Boolean, privacy: Boolean, experience: Boolean, firstEvent: Boolean, firstInvites: Boolean }
  },
  metrics: {                            // denormalized counters
    memberCount: Number,
    eventCount: Number,
    totalRevenueCents: Number
  },
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { slug: 1 } unique
- { status: 1 }
- { createdBy: 1 }
- { deletedAt: 1 }
```

### 3.3 memberships
```js
{
  _id: ObjectId,
  userId: ObjectId,                     // ref users
  communityId: ObjectId,                // ref communities
  role: { type: String, enum: ['member','event_manager','subadmin','admin'], default: 'member' },
  status: { type: String, enum: ['active','pending','banned'], default: 'active' },
  joinedAt: Date,
  invitedBy: ObjectId,
  onboarding: {
    communityOnboardingCompletedAt: Date,
    rulesAcceptedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { userId: 1, communityId: 1 } unique
- { communityId: 1, role: 1 }
- { communityId: 1, status: 1 }
```

### 3.4 events
```js
{
  _id: ObjectId,
  communityId: ObjectId,                // required for tenant scoping
  title: String,
  description: String,
  category: String,
  coverImageUrl: String,
  type: { type: String, enum: ['one_time','recurring_parent','recurring_instance'] },
  recurrenceRule: {                     // for recurring_parent
    freq: { type: String, enum: ['daily','weekly','biweekly','monthly','custom'] },
    interval: Number,
    byDay: [String],                    // ['MO','WE','FR']
    byMonthDay: Number,
    endType: { type: String, enum: ['never','until','count'] },
    until: Date,
    count: Number
  },
  parentEventId: ObjectId,              // for recurring_instance, ref to parent
  startAt: Date,
  endAt: Date,
  timezone: String,
  location: {
    type: { type: String, enum: ['physical','online','hybrid'] },
    address: String,
    url: String
  },
  capacity: Number,
  speakers: [{ name: String, bio: String, photoUrl: String }],
  pricing: {
    type: { type: String, enum: ['free','paid','subscription_only','external'] },
    priceCents: Number,
    currency: { type: String, default: 'USD' },
    refundPolicyHours: Number,
    externalUrl: String,
    subscriptionIncluded: Boolean
  },
  status: { type: String, enum: ['draft','published','cancelled','completed'], default: 'draft' },
  visibility: { type: String, enum: ['community','invite'], default: 'community' },
  managers: [ObjectId],                 // user IDs
  createdBy: ObjectId,
  metrics: {
    rsvpCount: Number,
    paidCount: Number,
    waitlistCount: Number,
    totalRevenueCents: Number
  },
  summary: {
    publishedAt: Date,
    body: String
  },
  cancelledAt: Date,
  cancellationReason: String,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { communityId: 1, startAt: 1 }
- { communityId: 1, status: 1 }
- { managers: 1 }
- { parentEventId: 1 }
- { startAt: 1, status: 1 }            // for reminder cron
```

### 3.5 eventRsvps
```js
{
  _id: ObjectId,
  eventId: ObjectId,
  communityId: ObjectId,
  userId: ObjectId,
  status: { type: String, enum: ['going','not_going','maybe','waitlist','cancelled'] },
  paymentId: ObjectId,                  // ref payments if paid
  paymentStatus: { type: String, enum: ['none','pending','paid','refunded'] },
  attendedAt: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { eventId: 1, userId: 1 } unique
- { userId: 1, status: 1 }
- { eventId: 1, status: 1 }
```

### 3.6 materials
```js
{
  _id: ObjectId,
  eventId: ObjectId,
  communityId: ObjectId,
  title: String,
  description: String,
  type: { type: String, enum: ['pdf','video','audio','image','slides','other'] },
  fileUrl: String,
  fileSizeBytes: Number,
  durationSeconds: Number,              // for video/audio
  uploadedBy: ObjectId,
  createdAt: Date
}

Indexes:
- { eventId: 1, createdAt: -1 }
```

### 3.7 initiatives
```js
{
  _id: ObjectId,
  communityId: ObjectId,
  title: String,
  description: String,
  category: { type: String, enum: ['event','volunteer','product','social','other'] },
  coverImageUrl: String,
  authorId: ObjectId,
  status: { type: String, enum: ['draft','submitted','under_review','approved','active','completed','rejected'] },
  supporters: [ObjectId],
  contributors: [ObjectId],
  targetDate: Date,
  supporterCount: Number,
  commentCount: Number,
  reviewedBy: ObjectId,
  reviewedAt: Date,
  rejectionReason: String,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { communityId: 1, status: 1, updatedAt: -1 }
- { authorId: 1 }
```

### 3.8 posts
```js
{
  _id: ObjectId,
  communityId: ObjectId,
  authorId: ObjectId,
  type: { type: String, enum: ['announcement','discussion','update'] },
  title: String,
  body: String,
  imageUrls: [String],
  isPinned: Boolean,
  isLocked: Boolean,
  reactionCounts: Map,                  // { 'like': 23, 'heart': 5 }
  commentCount: Number,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { communityId: 1, isPinned: -1, createdAt: -1 }
```

### 3.9 comments
```js
{
  _id: ObjectId,
  parentType: { type: String, enum: ['post','initiative','event_qa'] },
  parentId: ObjectId,
  communityId: ObjectId,
  authorId: ObjectId,
  replyToId: ObjectId,                  // for threaded replies
  body: String,
  reactionCounts: Map,
  isHidden: Boolean,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { parentType: 1, parentId: 1, createdAt: 1 }
- { authorId: 1 }
```

### 3.10 payments
```js
{
  _id: ObjectId,
  communityId: ObjectId,
  userId: ObjectId,
  eventId: ObjectId,
  rsvpId: ObjectId,
  subscriptionId: ObjectId,
  stripePaymentIntentId: { type: String, index: true },
  stripeCheckoutSessionId: String,
  amountCents: Number,
  currency: String,
  status: { type: String, enum: ['pending','succeeded','failed','refunded','partial_refund'] },
  refundedAmountCents: Number,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { communityId: 1, createdAt: -1 }
- { userId: 1, status: 1 }
- { stripePaymentIntentId: 1 } unique sparse
```

### 3.11 subscriptions
```js
{
  _id: ObjectId,
  communityId: ObjectId,
  userId: ObjectId,
  stripeSubscriptionId: String,
  stripeCustomerId: String,
  plan: { type: String, enum: ['monthly','annual'] },
  status: { type: String, enum: ['active','past_due','cancelled','incomplete'] },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: Boolean,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { userId: 1, communityId: 1 }
- { stripeSubscriptionId: 1 } unique
- { status: 1, currentPeriodEnd: 1 }
```

### 3.12 notifications
```js
{
  _id: ObjectId,
  userId: ObjectId,
  communityId: ObjectId,
  type: String,                         // e.g. 'event.reminder.1h', 'mention.comment'
  title: String,
  body: String,
  payload: Object,                      // deep link info
  readAt: Date,
  createdAt: Date
}

Indexes:
- { userId: 1, readAt: 1, createdAt: -1 }
```

### 3.13 devices
```js
{
  _id: ObjectId,
  userId: ObjectId,
  fcmToken: { type: String, unique: true },
  platform: { type: String, enum: ['ios','android'] },
  appVersion: String,
  lastSeenAt: Date,
  createdAt: Date
}

Indexes:
- { fcmToken: 1 } unique
- { userId: 1 }
```

### 3.14 auditLogs
```js
{
  _id: ObjectId,
  actorId: ObjectId,
  actorRole: String,
  communityId: ObjectId,                // null for super admin global actions
  action: String,                       // 'community.suspend', 'event.cancel', etc.
  targetType: String,
  targetId: ObjectId,
  metadata: Object,
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}

Indexes:
- { communityId: 1, createdAt: -1 }
- { actorId: 1, createdAt: -1 }
- { action: 1, createdAt: -1 }
- { createdAt: 1 } TTL after 1 year
```

### 3.15 refreshTokens
```js
{
  _id: ObjectId,
  userId: ObjectId,
  tokenHash: String,                    // hashed before storage
  expiresAt: Date,
  revokedAt: Date,
  replacedByTokenId: ObjectId,          // for rotation
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}

Indexes:
- { tokenHash: 1 } unique
- { userId: 1 }
- { expiresAt: 1 } TTL
```

### 3.16 invitations
```js
{
  _id: ObjectId,
  communityId: ObjectId,
  invitedBy: ObjectId,
  email: String,
  role: String,                         // role to assign on acceptance
  token: { type: String, unique: true },
  expiresAt: Date,
  acceptedAt: Date,
  acceptedByUserId: ObjectId,
  createdAt: Date
}

Indexes:
- { token: 1 } unique
- { communityId: 1, email: 1 }
- { expiresAt: 1 }
```

### 3.17 applications
```js
{
  _id: ObjectId,
  communityId: ObjectId,
  userId: ObjectId,
  message: String,
  status: { type: String, enum: ['pending','approved','rejected'] },
  reviewedBy: ObjectId,
  reviewedAt: Date,
  rejectionReason: String,
  createdAt: Date
}

Indexes:
- { communityId: 1, status: 1 }
- { userId: 1, communityId: 1 } unique
```

## 4. Tenant isolation safeguards

1. Every community-scoped collection includes `communityId`
2. Mongoose middleware automatically adds `communityId` filter to queries when context is available
3. Compound indexes always lead with `communityId` for community-scoped queries
4. Pre-save hooks reject documents without `communityId` (where required)

## 5. Counter maintenance

Denormalized counters (e.g. `community.metrics.memberCount`) are updated via:
- Mongoose post-save hooks for inserts
- Cron jobs for nightly reconciliation
- Atomic `$inc` operations to avoid race conditions

## 6. Migrations

Use `migrate-mongo` or similar:
```
backend/migrations/
  ├── 20260101000000-initial-schema.js
  ├── 20260201000000-add-stripe-fields.js
  └── ...
```

Run migrations as part of CI/CD before deploying.

## 7. Backup strategy

| Item | Frequency | Retention |
|---|---|---|
| Full backup | Daily | 30 days |
| Point-in-time recovery | Continuous | 7 days |
| Cold archive | Weekly | 1 year |

MongoDB Atlas handles all of this natively; self-hosted MongoDB requires `mongodump` cron + S3 upload.

## 8. Acceptance criteria

- All indexes are created in migrations
- No collection allows community-scoped writes without `communityId`
- Counters stay accurate (verified by nightly reconciliation)
- A query against a different community returns zero documents
- TTL indexes on auditLogs and refreshTokens work correctly

## 9. Out of scope (v1)

- Sharding (single-replica-set is sufficient for v1)
- Read replicas (defer until load justifies)
- Time-series collections (for analytics, Phase 2)
- ElasticSearch for full-text search (Phase 2)
