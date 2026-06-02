# PRD 20 — Roadmap & Milestones

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

The phased delivery plan that ties all other PRDs into a sequence. Each phase is a 2–4 week sprint with concrete deliverables, validation criteria, and dependencies on prior phases.

## 2. Timeline summary

| Phase | Duration | Deliverable |
|---|---|---|
| P0 | Week 0 | Foundations & environment |
| P1 | Weeks 1–2 | Backend skeleton + auth |
| P2 | Weeks 3–4 | Multi-tenant model + roles |
| P3 | Weeks 5–6 | Events MVP |
| P4 | Weeks 7–8 | Payments |
| P5 | Weeks 9–10 | Initiatives + discussions |
| P6 | Weeks 11–12 | Mobile UI completion |
| P7 | Weeks 13–14 | Notifications + onboarding polish |
| P8 | Weeks 15–16 | Beta with pilot communities |
| P9 | Weeks 17–18 | App Store + Play submission |
| P10 | Weeks 19–20 | Public launch + post-launch fixes |
| P11 | Weeks 21–24 | v1.1 features + scale prep |

**Total to public launch: ~5 months.** Buffer: 1 month.

## 3. Phase details

### P0 — Foundations (week 0)
**Goals:** environment, repos, accounts, scaffolding

- Set up GitHub repos (backend, mobile)
- Create MongoDB Atlas cluster (dev + staging + prod)
- Create Stripe test accounts
- Create Firebase projects (FCM)
- Provision staging VPS
- Configure domain + SSL
- Apple Developer + Google Play accounts
- Skeleton Express app + skeleton Flutter app
- Docker compose runs locally

**Exit criteria:** `docker compose up` runs the backend; Flutter app boots and shows blank screen.

---

### P1 — Backend skeleton + auth (weeks 1–2)
**PRDs:** 01, 02, 13, 14 (partial)

- Express app with middleware, error handling, logging
- MongoDB connection + base models (User, RefreshToken)
- Auth endpoints: register, login, refresh, logout, /me
- JWT generation + verification
- Password reset flow with email
- Rate limiting
- Health check endpoint
- Unit + integration tests for auth
- CI pipeline for backend

**Exit criteria:** A user can register, log in, and call /me. Tests pass in CI.

---

### P2 — Multi-tenant + roles (weeks 3–4)
**PRDs:** 02, 03, 04, 05, 14

- Models: Community, Membership
- Super Admin endpoints: create community, list communities, suspend/restore
- Community Admin endpoints: dashboard, member management
- Role middleware
- Cross-tenant isolation tests
- Audit logging
- Super Admin bootstrap script

**Exit criteria:** Super Admin can create a community and assign an initial admin via API. Sub Admin role enforced. Audit logs working.

---

### P3 — Events MVP (weeks 5–6)
**PRDs:** 06, 07, 08, 14

- Models: Event, EventRSVP, Material
- Event CRUD endpoints (one-time only first; recurring in P5)
- RSVP endpoints
- Event Manager role + endpoints
- Materials upload (Cloudinary integration)
- Q&A thread
- Basic Flutter screens: event list, event detail, RSVP button

**Exit criteria:** A member can browse events and RSVP. An Event Manager can upload materials. End-to-end tested.

---

### P4 — Payments (weeks 7–8)
**PRDs:** 09, 14, 18

- Stripe integration setup
- Stripe Connect (or platform Stripe TBD)
- Single event paid checkout flow
- Subscription checkout flow
- Webhook handler
- Refund endpoint
- Sub Admin financial blocks
- Financial dashboard endpoint
- Mobile checkout screens

**Exit criteria:** A member can pay for an event and receive RSVP. Subscription works. Refunds work. Sub Admin blocked from financial.

---

### P5 — Initiatives + recurring events + discussions (weeks 9–10)
**PRDs:** 08 (recurring), 11

- Recurring event materialization
- Initiative model + endpoints
- Initiative moderation (approve/reject)
- Discussions / posts in community
- Comments
- Notifications scaffolding

**Exit criteria:** Recurring events generate instances. Members can create initiatives. Discussions work.

---

### P6 — Mobile UI completion (weeks 11–12)
**PRDs:** 12

- All member screens polished
- All admin screens polished
- Sub Admin and Event Manager UI variations
- Super Admin console
- Theming + dark mode
- RTL Hebrew support
- Empty states + error states everywhere

**Exit criteria:** Every screen in PRD 12 is built and styled. Visual QA pass.

---

### P7 — Notifications + onboarding polish (weeks 13–14)
**PRDs:** 10, 15

- FCM integration (iOS + Android)
- Push notifications for all event types
- In-app inbox
- Email templates + delivery
- Onboarding flow (user + community + admin)
- Notification preferences UI

**Exit criteria:** Push notifications work on both platforms. Onboarding is complete and tested.

---

### P8 — Beta with pilot communities (weeks 15–16)
**PRDs:** all

- Identify 3 pilot communities
- Onboard them via TestFlight + Play Internal
- Daily bug triage
- Weekly user interviews
- Performance + crash monitoring
- UX polish based on feedback

**Exit criteria:** 3 communities actively using the app. Crash-free rate >99%. No critical bugs.

---

### P9 — App Store + Play submission (weeks 17–18)
**PRDs:** 12, 16, 18

- Polish app icons, screenshots, store listings
- Privacy policy + terms of service published
- Fill privacy nutrition labels (Apple)
- Fill data safety form (Google)
- Account deletion flow
- Apple Sign-In implemented
- App Tracking Transparency (if applicable)
- Submit to TestFlight external review
- Submit to Play Closed Testing

**Exit criteria:** App passes Apple + Google review. Ready for production tracks.

---

### P10 — Public launch + post-launch (weeks 19–20)
**PRDs:** all

- Production deploy
- Submit to App Store production
- Submit to Play production
- Launch announcement
- Customer support setup (help center, support email)
- 24/7 monitoring rotation (founder shifts)
- Hotfix capacity for first 2 weeks

**Exit criteria:** App live in both stores. No SEV1 incidents in first week.

---

### P11 — v1.1 + scale (weeks 21–24)
**PRDs:** roadmap-driven

- Analytics dashboards refined
- Performance optimizations based on real usage
- Top feature requests from beta
- Scale infrastructure based on load
- Marketing / growth experiments

## 4. Phase gates

Each phase has explicit exit criteria. We do not advance until they're met. If a phase slips by more than a week, we cut scope rather than push the whole timeline.

## 5. Dependencies

```
P0 → P1 → P2 → P3 → P4
                 │
                 └─ P5 (in parallel with P4 partial)
                         │
                         └─ P6 → P7 → P8 → P9 → P10 → P11
```

## 6. Resourcing assumptions

Minimum viable team:
- 1 full-stack engineer (backend + Flutter)
- (optional) 1 designer or part-time UX collaborator

With this team, timeline is realistic. With 2 engineers (1 backend, 1 mobile), we can compress P3–P7 by 2–3 weeks.

## 7. Risks to timeline

| Risk | Mitigation |
|---|---|
| App Store rejection | Submit early to TestFlight for review feedback |
| Stripe Connect onboarding delays | Have platform-Stripe fallback ready |
| Push notification certificate issues | Test on real devices early in P7 |
| Pilot community pulls out | Recruit 5 pilots, expect 2-3 to actually engage |
| Scope creep | Strict phase gates, deferred features go to P11 |

## 8. Feature deferrals (post-v1)

Already marked out-of-scope in component PRDs. Tracked for v1.5 / v2:
- Web admin dashboard
- Multi-currency
- Promo codes
- Direct messaging
- Custom roles
- Multi-admin per community
- Live streaming
- AI moderation
- White-labeled per-community apps

## 9. Success criteria for v1 launch

- 3+ active pilot communities transition to production
- 100+ MAU within 30 days of launch
- 4.0+ app store rating
- < 1% crash rate
- Zero critical security incidents
- At least one paying community (subscription active)

## 10. Out of scope (this PRD)

- Detailed marketing plan
- Pricing strategy beyond platform fee structure
- Hiring plan
- Fundraising timeline
