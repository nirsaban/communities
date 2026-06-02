# PRD 17 — Testing Strategy

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Quality assurance approach across backend (Jest + Supertest), mobile (Flutter test framework), and end-to-end (Maestro or Detox). Focuses on the critical paths that, if broken, would lose user trust.

## 2. Test pyramid

```
       ┌─────────────────┐
       │  Manual /       │  ← exploratory, app store rehearsal
       │  Smoke tests    │
       ├─────────────────┤
       │      E2E        │  ← top user journeys (10–15 flows)
       ├─────────────────┤
       │  Integration    │  ← API endpoints, DB integration
       ├─────────────────┤
       │      Unit       │  ← business logic, utils, validators
       └─────────────────┘
```

Target ratios: 70% unit, 20% integration, 10% E2E.

## 3. Backend testing

### 3.1 Tools
- **Jest** — test runner + assertions
- **Supertest** — HTTP integration testing
- **mongodb-memory-server** — in-memory MongoDB for tests
- **nock** — HTTP mocking for Stripe, FCM, email
- **faker** — test data generation
- **istanbul / nyc** — coverage

### 3.2 Test categories

#### Unit tests
- All service functions (business logic)
- Validators (Zod schemas)
- Utility helpers (date math, pricing, role logic)
- Coverage target: 80%+

#### Integration tests
- API endpoints end-to-end (request → DB → response)
- Auth flows (login, refresh, logout)
- Role-based access control (every role × every endpoint)
- Multi-tenant isolation (cross-community access blocked)
- Stripe webhook handling
- Coverage target: 70%+ on routes

#### Critical test cases
- Sub Admin cannot access financial endpoints
- User from Community A cannot read Community B data
- Refresh token rotation works correctly
- Recurring event materialization
- RSVP creates payment intent for paid events
- Webhook idempotency (replay same event = same result)
- Rate limiting kicks in after threshold

### 3.3 Test data strategy
- Each test creates its own users / communities (isolated)
- Fixtures for complex setups (e.g., community with 50 members + 10 events)
- No shared state between tests
- DB cleared between test files

### 3.4 Sample test layout
```
backend/tests/
├── unit/
│   ├── services/
│   ├── validators/
│   └── utils/
├── integration/
│   ├── auth.test.js
│   ├── events.test.js
│   ├── payments.test.js
│   └── ...
├── fixtures/
└── helpers/
```

## 4. Mobile testing

### 4.1 Tools
- **flutter_test** — built-in widget testing
- **mocktail** — mocking
- **integration_test** — Flutter's integration testing
- **golden_toolkit** — golden image tests for visual regression
- **patrol** or **maestro** — full E2E on real devices

### 4.2 Test categories

#### Widget tests
- Reusable widgets (AppButton, EventCard, etc.)
- Critical screens render correctly with various states (loading, error, empty, populated)
- Form validation
- Coverage target: 50%+ on widgets

#### Repository / provider tests
- API client error handling (401, 500, network)
- State management (Riverpod providers)
- Caching logic

#### Golden tests
- Visual regression on key screens (home, event detail, profile)
- Both light + dark modes
- RTL (Hebrew) variants

#### Integration tests
- Login flow
- Onboarding flow
- RSVP flow (free event)
- Event detail viewing
- Push notification handling

### 4.3 Sample test layout
```
mobile/test/
├── unit/
│   ├── repositories/
│   └── providers/
├── widget/
│   └── features/
├── golden/
└── integration_test/
```

## 5. End-to-end testing

### 5.1 Tools
- **Maestro** (preferred) — YAML-based, runs on iOS + Android
- Alternative: **Patrol** for Flutter-native

### 5.2 Critical E2E flows

1. New user signup → onboarding → home feed
2. Login → switch community → view event
3. RSVP to free event → view in My RSVPs
4. RSVP to paid event → checkout → confirmation
5. Admin creates event → publishes → member sees it
6. Admin invites member → member receives email → signs up → joins
7. Sub admin denied access to financial dashboard
8. Event manager uploads material → attendee views it
9. Member proposes initiative → admin approves → initiative visible
10. Push notification received → tap → opens correct screen

### 5.3 Frequency
- Run E2E on every PR to main (subset of fastest flows)
- Full E2E suite on nightly schedule
- Pre-release: full E2E + manual exploratory

## 6. CI integration

### Backend CI (every PR)
1. Install deps
2. Lint (ESLint)
3. Type check (if TypeScript)
4. Run unit tests
5. Run integration tests with in-memory MongoDB
6. Report coverage

### Mobile CI (every PR)
1. `flutter pub get`
2. `flutter analyze`
3. `flutter test`
4. Build debug APK (verify build succeeds)

### E2E (nightly + pre-release)
- Spin up backend with seeded test data
- Boot iOS simulator + Android emulator
- Run Maestro flows
- Capture screenshots + videos on failure

## 7. Performance testing

- **k6** for backend load testing
  - Scenarios:
    - Login burst (1000 concurrent users)
    - Feed read (sustained 100 RPS)
    - Event RSVP spike (500 RSVPs in 30 seconds — common for popular events)
- **Flutter DevTools** for mobile performance profiling
- Target: 95th percentile API response < 300ms under expected load

## 8. Security testing

- **npm audit** — dependency vulnerability scan in CI
- **Snyk** or **Dependabot** — automated dependency PRs
- **OWASP ZAP** — pre-release security scan
- Manual penetration test before public launch (external firm if budget allows)

### Specific security tests
- SQL/NoSQL injection attempts on all input fields
- JWT tampering attempts
- Cross-tenant data access attempts
- Rate limit bypass attempts
- Webhook signature spoofing

## 9. Manual / exploratory testing

- Test plan per release
- Tested on: latest iOS + Android, 2 generations back
- Test devices:
  - iPhone 12 / latest iPhone
  - Pixel 6 / latest Pixel
  - Mid-range Android (Samsung A series)
- Test on slow network (3G simulation)
- Test in airplane mode → reconnect (offline behavior)

## 10. Acceptance criteria

- Backend unit + integration tests pass on every PR
- Mobile widget + integration tests pass on every PR
- Coverage reports generated and reviewed weekly
- E2E suite runs nightly with green status before release
- Performance benchmarks established and tracked over time
- No critical or high-severity security findings before public launch

## 11. Out of scope (v1)

- Chaos engineering / fault injection
- Visual regression on every screen (only critical ones)
- A/B test framework
- Synthetic monitoring beyond UptimeRobot
