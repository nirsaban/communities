# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

**This repo is currently documentation-only.** It contains 21 product requirements documents (PRDs) for a planned product — no source code, no `package.json`, no `Dockerfile`, no migrations exist yet. There is nothing to build, lint, or run. The first implementation phase (P0/P1 in `20-roadmap-milestones.md`) has not started.

When the user asks for code work, expect to be creating files from scratch following the PRD specs, not editing existing implementations.

## Where the docs live

All PRDs are inside `./prds/` (note the literal space and parentheses — this directory was likely created by extracting a downloaded ZIP). When referencing or reading docs, use that path:

```
./files (1)/README.md            # index of all PRDs
./files (1)/00-master-prd.md     # vision, goals, scope
./files (1)/01-..20-...md        # one PRD per topic
```

If you create source code, **do not** put it inside `files (1)/` — that directory is for specs. Create top-level `backend/` and `mobile/` directories as described in `01-platform-architecture.md` §7–§8.

## Product at a glance

A multi-tenant mobile SaaS for community management (events, members, payments, initiatives). Flutter (iOS+Android) talking to an Express + MongoDB backend, deployed via Docker on a VPS. Stripe for payments, FCM for push, Cloudinary for media. See `00-master-prd.md` and `01-platform-architecture.md` for the full picture.

## Reading order for code work

When asked to scaffold or implement a feature, read in this order:
1. `00-master-prd.md` — vision and scope boundaries
2. `01-platform-architecture.md` — multi-tenant model, folder layout, stack
3. `02-auth-authorization.md` — role model, JWT, middleware design
4. `13-backend-api.md` — full endpoint list, response shapes, middleware chain
5. `14-database-schema.md` — every Mongoose schema with indexes
6. Then the topic-specific PRD (e.g., `08-event-system.md` for events, `09-payment-monetization.md` for Stripe work)
7. `20-roadmap-milestones.md` — phase order, so you don't build P5 features before P2 foundations

For mobile work, `12-mobile-app-flutter.md` is the equivalent companion to PRDs 13 + 14.

## Architectural invariants to preserve

These are scattered across multiple PRDs but apply to every change:

- **Tenant isolation by `communityId`.** Every community-scoped collection carries `communityId`; every compound index leads with it; the JWT contains `userId` only (never `communityId`); middleware (`loadMembership`) verifies the requesting user has a valid membership in the target community. Cross-community reads/writes must be impossible at the API layer. See `01` §5 and `14` §4.
- **Role hierarchy (5 roles):** Super Admin → Community Admin → Sub Admin → Event Manager → Member. Sub Admin is explicitly blocked from financial endpoints — there is a dedicated middleware (`blockSubAdminFromFinancial`) for this. Role × endpoint matrix lives in `02` §3.3.
- **Layered backend:** routes → controllers → services → models. Business logic belongs in services, not controllers. Validators (Zod) are separate from controllers.
- **Stateless API:** JWT only, no server sessions. Access token 15 min, refresh token 30 days (hashed, rotated on use, revocable via `refreshTokens` collection).
- **Versioned routes:** everything under `/api/v1/...`.

## Cross-PRD conventions (from `README.md` §Conventions)

When writing code or new docs, conform to these or you'll create inconsistency with the spec set:

- JSON keys: **camelCase** (no snake_case anywhere in API payloads).
- Timestamps: **ISO 8601, UTC**.
- Currency: stored as **integer cents** (never floats). Field names like `amountCents`, `priceCents`, `totalRevenueCents`.
- PRD prose uses sentence case for headings.
- Standard response envelope: `{ data, meta }` for success, `{ error: { code, message, details } }` for failure. Error codes are an enum — see `13-backend-api.md` §3.

## Tech stack reminder (don't substitute)

The PRDs commit to specific libraries; don't swap in alternatives without checking.

- **Backend:** Node.js LTS, Express, Mongoose, Zod (validation), Winston+Morgan (logging), Stripe SDK, Multer+Cloudinary, node-cron, Jest+Supertest, bcryptjs (cost 12), express-rate-limit, helmet, express-mongo-sanitize.
- **Mobile:** Flutter (latest stable), Riverpod (state), Dio (HTTP), go_router (nav), Flutter Secure Storage + Hive (local), firebase_messaging (push), flutter_form_builder + reactive_forms (forms), cached_network_image.
- **Infra:** Docker + Docker Compose, Nginx, Let's Encrypt/Certbot, GitHub Actions, Sentry, UptimeRobot, MongoDB Atlas (preferred) or self-hosted Mongo in Docker.

## Non-goals for v1 (don't accidentally build these)

Listed in `00-master-prd.md` §4 and §11. Most commonly mistaken:

- No web app or web admin dashboard (mobile-first only).
- No Flutter Web fallback.
- No marketplace/discovery between communities.
- No AI features.
- No multi-currency, no promo codes, no DMs, no live streaming — all deferred per `20` §8.

Localization is **EN + Hebrew (RTL)** at launch; nothing else.

## Status of the PRDs

All 21 docs are marked **Draft v1.0**, dated 2026-05-31, approvals pending. Treat them as the source of truth, but if you spot a contradiction between two PRDs, surface it to the user rather than silently picking one.
