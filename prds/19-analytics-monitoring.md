# PRD 19 — Analytics & Monitoring

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

How we observe the system's health (monitoring) and understand user behavior (analytics) — at the platform level (Super Admin), per-community (Admins), and product-team level (us).

## 2. Three layers

| Layer | Audience | Tools |
|---|---|---|
| Infrastructure monitoring | Engineering team | UptimeRobot, Sentry, MongoDB Atlas metrics |
| Product analytics | Engineering + product | PostHog (or Mixpanel), internal dashboards |
| In-product analytics | Super Admin + Community Admins | Custom dashboards in app |

## 3. Infrastructure monitoring

### 3.1 Health check
- `GET /api/v1/health` returns:
  ```json
  {
    "status": "ok",
    "db": "ok",
    "stripe": "ok",
    "uptime": 12345,
    "version": "1.2.0"
  }
  ```
- UptimeRobot pings every 5 min from multiple regions
- Slack alert on 2 consecutive failures

### 3.2 Error tracking
- **Sentry** for backend exceptions (uncaught errors, promise rejections)
- **Sentry** for Flutter crashes (Flutter SDK integration)
- Alerts:
  - New error type: Slack
  - Error rate spike (>5x baseline): Slack + email
  - Critical errors (payment, auth): immediate Slack ping

### 3.3 Performance metrics
- API response times (Sentry / custom middleware)
- Database query duration (Mongoose slow query log)
- Mobile crash-free rate (Sentry)
- Mobile cold-start time (Firebase Performance, optional)

### 3.4 Logs
- Structured JSON logs (Winston)
- Local: stdout → Docker
- Production: shipped to Papertrail / Loki / Cloudwatch (TBD)
- Retention: 90 days

### 3.5 Database monitoring
- MongoDB Atlas built-in metrics (connections, ops/sec, slow queries)
- Alerts: connection saturation, slow query rate, disk usage

## 4. Product analytics

### 4.1 Tool
- **PostHog** self-hosted or cloud (free tier)
- Alternative: Mixpanel or Amplitude

### 4.2 Event taxonomy (selected)

| Event | Properties |
|---|---|
| `app.opened` | platform, version |
| `signup.completed` | source (organic / invitation), method |
| `login.success` | method |
| `onboarding.completed` | duration_seconds |
| `community.viewed` | communityId |
| `community.switched` | fromId, toId |
| `event.viewed` | eventId, communityId, isPaid |
| `event.rsvp_started` | eventId, isPaid |
| `event.rsvp_completed` | eventId, isPaid, amountCents |
| `event.rsvp_cancelled` | eventId, hoursBeforeStart |
| `payment.checkout_started` | amountCents, type |
| `payment.checkout_succeeded` | amountCents, type |
| `payment.checkout_failed` | amountCents, reason |
| `initiative.created` | category |
| `initiative.supported` | initiativeId |
| `post.created` | postType |
| `comment.created` | parentType |
| `notification.tapped` | type |
| `screen.viewed` | screenName, role |
| `feature.used` | featureName |

### 4.3 Funnels to track
1. Signup → onboarding → first community joined
2. Community joined → first event viewed → first RSVP
3. Event RSVP started → payment completed (paid events)
4. Subscription started → first renewal
5. Initiative created → approved → first supporter

### 4.4 Retention cohorts
- D1, D7, D30 retention by signup cohort
- Per-community retention
- Free vs paid user retention

### 4.5 Privacy
- All analytics events tied to userId (pseudonymous)
- No PII in event properties (no emails, names)
- Users can opt out in `/profile/privacy`
- Opt-out respected via analytics SDK

## 5. In-product analytics

### 5.1 Super Admin platform dashboard

Metrics:
- Total communities (active / suspended)
- Total users (signups this week / month)
- Total events (created / completed this month)
- Platform revenue (this month, all communities, after Stripe fees)
- Subscriptions (active count, MRR)
- DAU / WAU / MAU
- Top communities by activity

Charts:
- Community growth over time
- User growth over time
- Revenue trend
- Event creation rate

### 5.2 Community Admin dashboard

Metrics:
- Members (total, new this week, active)
- Events (upcoming, this month, attendance rate)
- Revenue (this month, lifetime, by event)
- Subscriptions (active, MRR)
- Engagement (posts, comments, initiatives)

Charts:
- Member growth
- Event attendance trend
- Revenue trend
- Most popular events

### 5.3 Event-level analytics

For each event:
- Views
- RSVPs (going / not going / waitlist)
- Attendance (actual vs RSVP'd)
- Revenue
- Post-event engagement (Q&A, comments)

## 6. KPIs (north star + supporting)

### Platform
- Active communities (target: 50 in 12 months)
- MAU (target: 5,000 in 12 months)
- ARR (target: $50k in 12 months)
- Net Revenue Retention (target: >100%)

### Engagement
- DAU/MAU ratio (target: >25%)
- Avg events RSVP'd per user per month
- Initiative creation rate

### Quality
- App store rating (target: 4.5+)
- Crash-free rate (target: >99.5%)
- API uptime (target: 99.5%)
- Support response time (target: <24h)

## 7. Data pipeline (Phase 2)

If analytics outgrow PostHog:
- ETL events to data warehouse (BigQuery / Snowflake)
- dbt for transformations
- Metabase / Looker for BI

Not in scope for v1.

## 8. Acceptance criteria

- Sentry receives errors from backend and mobile
- UptimeRobot monitors /health with alerts to Slack
- Key user events fire to analytics (verified in PostHog Live View)
- Super Admin dashboard displays accurate platform metrics
- Community Admin dashboard displays accurate community metrics
- User analytics opt-out works (no events emitted)

## 9. Out of scope (v1)

- A/B testing framework
- ML-driven recommendations / personalization
- Heatmap / session replay (potential privacy concerns)
- Custom event schemas per community
- Public data API for community admins
