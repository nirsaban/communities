# Community Management SaaS — PRD Index

Multi-tenant mobile SaaS platform built with Flutter + Express + MongoDB + Docker.

## Document set

| # | Document | Status |
|---|---|---|
| 00 | [Master PRD](00-master-prd.md) | Draft v1.0 |
| 01 | [Platform Architecture](01-platform-architecture.md) | Draft v1.0 |
| 02 | [Authentication & Authorization](02-auth-authorization.md) | Draft v1.0 |
| 03 | [Super Admin Module](03-super-admin-module.md) | Draft v1.0 |
| 04 | [Community Admin Module](04-community-admin-module.md) | Draft v1.0 |
| 05 | [Sub Admin Module](05-sub-admin-module.md) | Draft v1.0 |
| 06 | [Event Manager Module](06-event-manager-module.md) | Draft v1.0 |
| 07 | [Community Members Module](07-community-members-module.md) | Draft v1.0 |
| 08 | [Event System](08-event-system.md) | Draft v1.0 |
| 09 | [Payment & Monetization](09-payment-monetization.md) | Draft v1.0 |
| 10 | [Onboarding Flow](10-onboarding-flow.md) | Draft v1.0 |
| 11 | [Initiatives Section](11-initiatives.md) | Draft v1.0 |
| 12 | [Mobile App (Flutter)](12-mobile-app-flutter.md) | Draft v1.0 |
| 13 | [Backend API (Express)](13-backend-api.md) | Draft v1.0 |
| 14 | [Database Schema (MongoDB)](14-database-schema.md) | Draft v1.0 |
| 15 | [Notifications](15-notifications.md) | Draft v1.0 |
| 16 | [Deployment & DevOps](16-deployment-devops.md) | Draft v1.0 |
| 17 | [Testing Strategy](17-testing-strategy.md) | Draft v1.0 |
| 18 | [Security & Compliance](18-security-compliance.md) | Draft v1.0 |
| 19 | [Analytics & Monitoring](19-analytics-monitoring.md) | Draft v1.0 |
| 20 | [Roadmap & Milestones](20-roadmap-milestones.md) | Draft v1.0 |

## Tech stack

- **Mobile:** Flutter, Riverpod, Dio, go_router
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **Payments:** Stripe
- **Push:** Firebase Cloud Messaging (FCM)
- **Storage:** Cloudinary
- **Hosting:** Docker + Docker Compose on VPS
- **Reverse proxy:** Nginx + Let's Encrypt
- **CI/CD:** GitHub Actions

## Roles

- **Super Admin** — global platform operator
- **Community Admin** — full control of their community
- **Sub Admin** — admin minus financial
- **Event Manager** — per-event scope
- **Member** — community participant

## Reading order

For new contributors:
1. **00** to understand the vision
2. **01** for system architecture
3. **20** for the delivery plan
4. Then drill into the modules / features relevant to your work

For architects / engineers:
1. **01** Architecture
2. **13** Backend API
3. **14** Database
4. **02** Auth model
5. **16** Deployment

For product / design:
1. **00** Vision
2. **03–07** Role modules
3. **08–11** Feature PRDs
4. **12** Mobile app spec
5. **10** Onboarding

## Conventions

- PRDs use sentence case
- API examples use camelCase JSON keys
- Times are ISO 8601 / UTC unless otherwise stated
- Currency stored as integer cents
