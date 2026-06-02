# PRD 12 — Mobile App (Flutter)

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Detailed specification of the Flutter mobile app — architecture, navigation, state management, UI components, and platform-specific considerations.

## 2. Technical foundation

| Layer | Choice | Rationale |
|---|---|---|
| Flutter SDK | Latest stable | iOS + Android in one codebase |
| Min iOS | 13.0 | Covers 95%+ devices |
| Min Android | API 23 (6.0) | Covers 95%+ devices |
| State mgmt | Riverpod | Lightweight, fast, testable |
| Navigation | go_router | Declarative, deep-link friendly |
| HTTP | Dio | Interceptors, retry, cancel tokens |
| Local storage | flutter_secure_storage (tokens) + Hive (cache) | |
| Push | firebase_messaging | Cross-platform |
| Forms | flutter_form_builder + reactive_forms | |
| Images | cached_network_image | |
| Localization | flutter_localizations + intl | EN + HE for v1 |

## 3. App architecture (Clean-ish)

```
lib/
├── core/
│   ├── config/         (env, constants, theme)
│   ├── errors/         (failure classes)
│   ├── network/        (Dio setup, interceptors)
│   └── utils/
├── data/
│   ├── datasources/    (remote API clients)
│   ├── models/         (DTOs with json parsing)
│   └── repositories/   (concrete repo implementations)
├── domain/
│   ├── entities/       (pure business objects)
│   ├── repositories/   (abstract interfaces)
│   └── usecases/       (single-purpose use cases)
├── features/
│   ├── auth/
│   ├── home/
│   ├── events/
│   ├── initiatives/
│   ├── members/
│   ├── admin/
│   ├── super_admin/
│   ├── event_manager/
│   ├── payments/
│   └── profile/
│       └── (each feature has presentation/widgets/providers/screens)
├── shared/
│   ├── widgets/        (reusable UI components)
│   └── theme/
└── main.dart
```

## 4. Navigation map

```
/ → splash → /auth/login or /home

/auth
  ├── /login
  ├── /register
  ├── /forgot-password
  └── /reset-password

/onboarding
  ├── /welcome
  ├── /profile
  └── /interests

/home (bottom nav root)
  ├── /home (feed tab)
  ├── /events (events tab)
  ├── /initiatives (initiatives tab)
  ├── /inbox (notifications tab)
  └── /profile (profile tab)

/events/:eventId
/initiatives/:initiativeId
/communities/switch

/admin/* (only visible to admins/sub admins)
/super/* (only visible to super admin)
/manager/* (only visible to event managers)
```

## 5. Role-based UI

The bottom nav and side menu adapt based on the user's role in the active community:

| Role | Tabs visible |
|---|---|
| Super Admin | Home, Super Admin Console, Profile |
| Community Admin | Home, Events, Initiatives, Inbox, Admin |
| Sub Admin | Home, Events, Initiatives, Inbox, Admin (financial hidden) |
| Event Manager | Home, Events, Initiatives, Inbox, Manager |
| Member | Home, Events, Initiatives, Inbox, Profile |

Admin/Manager/Super tabs lead to dedicated stacks of admin screens.

## 6. State management with Riverpod

- `AuthProvider` — current user, tokens, login state
- `ActiveCommunityProvider` — currently selected community
- `MembershipProvider` — current user's role in active community
- Feature-level providers (e.g., `eventsListProvider`, `initiativeDetailProvider`)
- `NotificationsProvider` — unread count, recent notifications
- All providers use `AsyncNotifierProvider` for async data with loading/error states

## 7. Theming

- Material 3 base
- Light + dark mode (system default, user can override)
- Brand colors:
  - Primary: configurable per community (defaults to platform color)
  - Each community can theme its content area
- Typography scale via Theme.of(context).textTheme
- Spacing: 4/8/12/16/24/32/48 scale

## 8. Key reusable widgets

| Widget | Purpose |
|---|---|
| `AppButton` | Primary, secondary, ghost, danger variants |
| `AppTextField` | Standardized text input with validation |
| `EventCard` | Used in lists everywhere |
| `MemberAvatar` | Photo with fallback initials |
| `EmptyState` | Icon + title + body + CTA |
| `ErrorState` | Standardized error UI with retry |
| `RoleBadge` | Visual indicator of user role |
| `PriceTag` | Free / Paid / Subscription-included |
| `LoadingShimmer` | Skeleton loaders for lists |

## 9. Offline behavior

| Data | Offline policy |
|---|---|
| Auth tokens | Always available locally |
| Home feed | Cached last 24h, served from cache when offline |
| Event detail | Cached on visit |
| Event materials | Optional download for offline viewing |
| RSVPs / writes | Queued in Hive, retried on reconnect |
| Discussions / new posts | Online only |

## 10. Performance targets

| Metric | Target |
|---|---|
| Cold start | <2s |
| Warm start | <500ms |
| Home feed first paint | <1s |
| Image lazy loading | All lists |
| Build size (Android APK) | <40MB |
| Memory usage | <200MB steady state |
| Crash-free rate | >99.5% |

## 11. Platform-specific

### iOS
- Apple Sign-In required (per App Store guidelines if email signup offered)
- Adaptive icon
- Privacy nutrition labels filled in App Store Connect
- App Tracking Transparency prompt (if analytics SDK identifies users)

### Android
- Adaptive icon
- Material You theming support
- Notification channels per type (events, mentions, payments)
- Play Store data safety form filled

## 12. Accessibility

- Semantic labels on all interactive elements
- Text scale support (up to 200%)
- High-contrast mode support
- Voiceover/TalkBack tested for all critical flows
- No information conveyed by color alone

## 13. Internationalization

- English (default)
- Hebrew (RTL) — primary launch target
- Strings extracted to ARB files
- RTL layout mirroring verified for all screens

## 14. Deep linking

URL pattern: `https://app.example.com/...`
- `/events/:id` opens event detail (post-auth)
- `/initiatives/:id` opens initiative
- `/invite/:code` opens community invite acceptance
- `/reset-password?token=...` opens reset password screen

Universal Links (iOS) + App Links (Android) configured.

## 15. Acceptance criteria

- App passes Apple TestFlight review
- App passes Google Play internal track review
- All 5 roles can use their respective flows end-to-end
- Cold start under 2 seconds on mid-tier devices
- RTL layout works correctly when Hebrew is selected
- Deep links open correct screens after authentication
- Push notifications open the relevant content

## 16. Out of scope (v1)

- Tablet-optimized layouts (responsive but not custom)
- Apple Watch / Wear OS companion
- App Clip / Instant App
- Web fallback (Flutter Web)
