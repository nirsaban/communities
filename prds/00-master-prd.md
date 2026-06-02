# PRD 00 — Master Product Requirements Document

**Product:** Community Management SaaS Platform
**Codename:** TBD
**Document owner:** Product
**Status:** Draft v1.0
**Last updated:** 2026-06-01

---

## 1. Executive summary

A multi-tenant mobile SaaS platform that enables organizations, groups, and communities to manage their members, events, content, and monetization from a single Flutter mobile app. Each community operates as an independent tenant under a centralized super-admin architecture.

## 2. Vision

Become the default mobile-first operating system for community-driven organizations — from religious groups and professional networks to hobby clubs and educational cohorts.

## 3. Problem statement

Community organizers today juggle WhatsApp groups, Excel sheets, Google Forms, PayPal links, and Zoom calls to manage their communities. This creates fragmentation, poor member experience, no monetization path, and zero analytics. Existing solutions (Mighty Networks, Circle, Discord) are web-first, expensive, or built for creators rather than structured communities.

## 4. Goals and non-goals

### Goals
- Launch a production-ready Flutter mobile app (iOS + Android) within 6 months
- Support unlimited independent communities under one platform
- Enable 5 distinct user roles with granular permissions
- Provide event management with payment monetization
- Deliver a member experience that feels native, fast, and modern

### Non-goals (v1)
- Web app (mobile-first only for v1)
- Desktop app
- White-label per-community apps
- AI-generated content
- Marketplace/discovery between communities

## 5. Target users

| Persona | Description | Primary need |
|---|---|---|
| Platform operator | The business running this SaaS | Multi-tenant control, revenue, analytics |
| Community founder | Creates and runs a community | Tools to organize members and events |
| Community staff | Helps run a community | Delegated permissions without financial access |
| Event organizer | Runs specific events | Focused event tools, attendee engagement |
| Community member | Participates in a community | Discover, join, engage, contribute |

## 6. Key value propositions

1. **All-in-one** — events, payments, members, content, discussions in one app
2. **Multi-tenant from day one** — runs hundreds of communities on shared infrastructure
3. **Role-based by design** — Super Admin → Admin → Sub Admin → Event Manager → Member
4. **Monetization built-in** — one-time payments, subscriptions, external links
5. **Mobile-native** — Flutter for iOS + Android, no web fallback

## 7. Success metrics (north-star and supporting)

| Metric | Target (12 months) |
|---|---|
| Active communities | 50+ |
| Monthly active users (MAU) | 5,000+ |
| Events created / month | 500+ |
| Paying communities | 20+ |
| Net revenue retention | >100% |
| App store rating | 4.5+ |

## 8. Scope summary (linked PRDs)

| # | PRD | Scope |
|---|---|---|
| 01 | Platform architecture | Multi-tenant model, tech stack |
| 02 | Auth & authorization | JWT, roles, permissions |
| 03 | Super Admin | Platform-wide management |
| 04 | Community Admin | Community setup and management |
| 05 | Sub Admin | Delegated admin |
| 06 | Event Manager | Event-specific tools |
| 07 | Community Members | Member experience |
| 08 | Event system | One-time, recurring, RSVP |
| 09 | Payments | Stripe, subscriptions |
| 10 | Onboarding | User and community onboarding |
| 11 | Initiatives | Member-driven projects |
| 12 | Mobile app | Flutter UI/UX |
| 13 | Backend API | Express REST API |
| 14 | Database | MongoDB schema |
| 15 | Notifications | Push notifications |
| 16 | Deployment | Docker, VPS, CI/CD |
| 17 | Testing | QA strategy |
| 18 | Security | Data protection |
| 19 | Analytics | Monitoring, logs |
| 20 | Roadmap | Phased delivery plan |

## 9. Constraints

- Mobile-only (Flutter) for v1
- Backend: Node.js + Express + MongoDB (self-managed via Docker on VPS)
- Payments: Stripe initial integration
- Timeline: 6 months to public launch
- Team size assumption: 1–3 engineers

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| App store rejection | Medium | High | Follow Apple/Google guidelines from day one |
| Multi-tenant data leakage | Low | Critical | Strict tenant isolation at API + DB level |
| Stripe compliance | Low | High | Use Stripe's hosted checkout when possible |
| Scope creep | High | Medium | Strict PRD-driven phases |
| Low community adoption | Medium | High | Beta with 3 pilot communities before public launch |

## 11. Out-of-scope (for v1, may revisit)

- Web admin dashboard (planned post-v1)
- Multi-language localization (Hebrew + English at launch only)
- Video conferencing integration
- AI assistants for community moderation
- Cross-community discovery

## 12. Approvals

| Role | Name | Status |
|---|---|---|
| Product owner | — | Pending |
| Engineering lead | — | Pending |
| Design lead | — | Pending |
