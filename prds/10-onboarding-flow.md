# PRD 10 — Onboarding Flow

**Parent:** 00-master-prd.md
**Status:** Draft v1.0

---

## 1. Overview

Onboarding is the first impression and the highest leverage moment in the product. We have two distinct flows: new user onboarding (general app intro + profile) and community-specific onboarding (intro to the community they're joining).

## 2. New user onboarding (first ever app launch)

### 2.1 Flow

```
Welcome screen → Sign up / Log in → Verify email (optional) → Profile setup → Community discovery → Home
```

### 2.2 Screens

| Step | Screen | Purpose |
|---|---|---|
| 1 | Welcome carousel (3 slides) | Explain what the app does |
| 2 | Sign up / Log in | Create account |
| 3 | Email verification | Confirm email (skippable, prompt later) |
| 4 | Profile photo + name | Required |
| 5 | Bio (optional) | Skip-able |
| 6 | Interests selector | Pick 3+ topics |
| 7 | Community discovery | Find communities by invite link, code, or directory |
| 8 | Home feed | Done |

### 2.3 Welcome carousel content

| Slide | Headline | Body |
|---|---|---|
| 1 | Welcome to [App] | The home for the communities that matter to you. |
| 2 | Never miss an event | Discover, RSVP, and join your community's events in one place. |
| 3 | Be part of the conversation | Share ideas, ask questions, and make a real impact. |

## 3. Community onboarding (joining a community)

When a user joins a new community (first time only), they go through a tailored onboarding for that community.

### 3.1 Flow

```
Invitation accepted / Application approved
  → Community welcome screen
  → Community rules (acknowledge)
  → Optional interests tied to this community
  → Welcome message from Admin
  → Community home
```

### 3.2 Admin-configurable
The Community Admin defines (during community onboarding wizard, PRD 04):
- Community welcome screen content
- Rules / guidelines
- Welcome message
- Optional category tags members can subscribe to

## 4. Admin onboarding (creating a community)

Triggered after Super Admin invites a Community Admin. First login lands them in the community wizard.

### 4.1 Flow

```
Login (via invitation link) → Set password → Welcome to Admin tools
  → Wizard step 1: Community basics (name, description, category)
  → Wizard step 2: Branding (logo, cover)
  → Wizard step 3: Privacy (public, invite-only, application)
  → Wizard step 4: Member experience (welcome message, rules)
  → Wizard step 5: First event (optional skip)
  → Wizard step 6: Invite first members (optional skip)
  → Admin dashboard
```

Each step is skippable except step 1.

## 5. UX requirements

- All onboarding screens use a consistent layout (progress indicator at top, single CTA at bottom)
- Skip buttons everywhere except critical fields
- Back button preserves state
- Progress is saved server-side after each step (resumable on crash / app close)
- No lock-in: user can finish later from settings
- Total time-to-complete: under 90 seconds for member onboarding, under 5 minutes for admin onboarding

## 6. Data model touchpoints

### `users` document
```
onboarding: {
  appOnboardingCompletedAt,
  profileCompletedAt,
  interestsCompletedAt
}
```

### `memberships` document
```
onboarding: {
  communityOnboardingCompletedAt,
  rulesAcceptedAt
}
```

### `communities` document
```
onboarding: {
  wizardCompletedAt,
  steps: { basics, branding, privacy, experience, firstEvent, firstInvites }
}
```

## 7. Empty-state engagement

After onboarding, if the home feed is empty:
- "No events yet" → suggest exploring other communities
- "Be the first to start an initiative" → CTA
- Show a curated set of community members to greet

## 8. Re-engagement triggers

If a user starts but doesn't finish onboarding:
- Push notification 1 hour later: "Finish setting up to get started"
- Email 24 hours later
- After 7 days, mark account as inactive but recoverable

## 9. Acceptance criteria

- New user can complete onboarding and reach the home feed in under 90 seconds
- A user joining a new community sees community-specific onboarding only once per community
- Admin wizard is resumable across sessions
- Skipped optional steps are reachable from settings
- Onboarding progress is server-side so it survives app reinstall

## 10. Out of scope (v1)

- AI-powered interest detection from social profiles
- Onboarding via deep link from external campaign
- Gamified onboarding with rewards
- Personality quizzes
