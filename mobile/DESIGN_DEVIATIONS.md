# Design Deviations Log

Any time Claude Code cannot implement a spec exactly, 
it logs here and flags for design review.

Format:
## [Screen Name] — [Date]
- **Spec required:** X
- **Built instead:** Y  
- **Reason:** (must be a technical constraint, not preference)
- **Status:** Pending review / Approved / Rejected

## EditProfile — 2026-06-02
- **Spec required:** UsernameField (handle/unique username, separate from DisplayName).
- **Built instead:** Display name + bio + photo + interests only. No username input.
- **Reason:** PRD 14 (database schema) does not define a `username` field on the User model. Adding one would require schema + uniqueness index + migration, which is a cross-PRD decision the spec set should sign off on first. Surfacing as a contradiction between spec JSON and PRD 14.
- **Status:** Pending review

## CommunityDiscovery — 2026-06-02
- **Spec required:** 6-digit InviteCodeInput (OTP) that resolves to a community.
- **Built instead:** Disabled / dimmed OTP input. Recommended-list cards + Join/Request CTAs are live.
- **Reason:** Backend invitations carry an opaque long token (see `Invitation` model + `/invitations/:token/accept`). There's no short 6-digit invite code at this snapshot. Adding one needs a model migration + collision strategy. Cards are the practical join path until then.
- **Status:** Pending review

## CommunityWelcome + CommunityRules — 2026-06-02
- **Spec required:** Route is `/c/:slug/welcome` and `/c/:slug/rules`.
- **Built instead:** `/c/:id/welcome` and `/c/:id/rules` (community ObjectId, not slug).
- **Reason:** Backend community detail endpoint is `GET /communities/:cid` keyed on ObjectId. Slug-aware routing would need a new lookup endpoint; routes work end-to-end with `:id`.
- **Status:** Pending review

## Checkout / Stripe — 2026-06-02 (dev-only stub)
- **Spec required:** Real Stripe Checkout WebView handoff with card field.
- **Built instead:** External-browser handoff via `url_launcher` + a `StubStripeService` activated when `STRIPE_SECRET_KEY` is missing (NODE_ENV != production). Stub serves an HTML page with Simulate-success / Cancel buttons. PaymentSuccess polls `GET /me/rsvps` to detect completion.
- **Reason:** `.env` has no Stripe keys this snapshot. The real path is fully wired (`RealStripeService` calls the official SDK) — just unconfigured. Production behavior unchanged: `getStripeService()` still throws if keys are missing in prod.
- **Status:** Pending review (resolves on first set of test keys + Stripe CLI webhook forward).

## SubscriptionPlans — 2026-06-02
- **Spec required:** Configurable plan prices.
- **Built instead:** Hard-coded "$12 / month" / "$120 / year" labels in `S.planMonthlyPrice()` / `S.planAnnualPrice()`. Backend Subscription priceId defaults to `price_stub_*` when not configured.
- **Reason:** Stripe Connect price IDs need a real Stripe account. Card layout is faithful to the spec; price strings move to a config block when real plans land.
- **Status:** Pending review

## ManageSubscription route — 2026-06-02
- **Spec required:** `/me/membership`.
- **Built:** `/me/membership` (new ManageSubscriptionScreen). Old `/me/subscriptions` kept as back-compat alias serving the legacy MySubscriptionsScreen so nothing inbound breaks.
- **Reason:** Spec-correct route added without removing the existing one to avoid breaking any external entry points or saved deep links.
- **Status:** Pending review

## MaterialsUpload — 2026-06-02 (no file picker)
- **Spec required:** FileDropZone with system file picker (pdf/mp4/ppt).
- **Built instead:** URL input field; multipart payload sends the URL as a small text "file" so the backend Material row carries the link. The visible "upload" drop zone is a static affordance for now.
- **Reason:** Mobile pubspec has no `file_picker` / `image_picker` package. Adding either is a dependency decision (storage permissions on Android, photo library on iOS) that should be sequenced with Cloudinary upload wiring.
- **Status:** Pending review

## AttendeeList QR Scan — 2026-06-02
- **Spec required:** QR scan button for fast door check-in.
- **Built instead:** Icon present in app-bar; tap shows "available in next update" snackbar.
- **Reason:** Requires `mobile_scanner` + camera permission flow; defer to a security/permissions sprint.
- **Status:** Pending review

## EditPricing — 2026-06-02
- **Spec required:** PriceTierList (editable early-bird / member tiers).
- **Built instead:** Single base-price field + a "tiered pricing coming soon" notice. Integrity warning surfaces when the event already has RSVPs.
- **Reason:** Backend Event.pricing has no tier subdoc; PRD 09 §12 explicitly defers promo codes / tiers to v2. Single price covers v1.
- **Status:** Pending review

## EditEvent AssignedManagerSelect — 2026-06-02
- **Spec required:** Member search to pick a new event manager.
- **Built instead:** No picker; field omitted. Backend `POST /events/:eid/managers` already exists; a member-directory search lands with C5/C6.
- **Reason:** Members directory + search UX is C5/C6 admin scope.
- **Status:** Pending review

## PublishRecap PhotoGridUpload — 2026-06-02
- **Spec required:** Multi-image picker with grid preview.
- **Built instead:** Variable list of URL input rows; Add-photo button appends another row. Backend stores `summary.photoUrls: string[]`.
- **Reason:** Same image_picker / Cloudinary gap as MaterialsUpload.
- **Status:** Pending review

## CreateEvent recurring + cover upload — 2026-06-02
- **Spec required:** Recurring event UI + cover image upload.
- **Built instead:** One-time events only; no cover upload yet (Event model supports `coverImageUrl` but UI ships in a later sprint with the picker work).
- **Reason:** PRD 08 §6 marks recurring as P5; v1 ships single occurrences. Cover upload bundled with the picker/Cloudinary work above.
- **Status:** Pending review

## EventCommandCenter live counter + Broadcast — 2026-06-02
- **Spec required:** Live check-in counter and Broadcast composer.
- **Built instead:** Static KPI rows refreshed via `eventDetailProvider`; Broadcast button now routes to BroadcastComposerScreen at `/manage/events/:id/broadcast` (C5 ships the composer).
- **Reason:** Live counter would need an SSE/socket layer that's outside the C4 scope; broadcast composer arrived with C5.
- **Status:** Broadcast addressed in C5; live counter pending review.

## ContentModeration — 2026-06-02 (no flagging model)
- **Spec required:** Cards for content with active flags + reporter chips.
- **Built instead:** Lists recent posts (hidden ones float to top) and lets the moderator Keep / Warn / Remove. Warn is audit-logged only; Remove sets `post.hidden = true`. Reporter UI omitted.
- **Reason:** No flagging model exists yet — Comment / Post / Initiative carry no `flags` collection or counter. Surfacing the most recent content gives moderators something to act on while the flagging system is designed.
- **Status:** Pending review

## MemberList bulk actions — 2026-06-02
- **Spec required:** Checkbox per row + floating bulk action bar (message / export / remove).
- **Built instead:** Tap row → MemberDetail. Single-row actions only.
- **Reason:** Bulk message overlaps the broadcast composer; bulk export needs CSV plumbing; bulk remove is dangerous and warrants a dedicated confirm flow. Defer.
- **Status:** Pending review

## SubAdminDashboard CommunitySwitcherPill — 2026-06-02
- **Spec required:** Pill at top to switch community context.
- **Built instead:** Implicit active community via `activeCommunityIdProvider`; no in-screen switcher on this surface.
- **Reason:** Multi-community switching for admin screens is C6 admin scope; C5 runs against the active community only.
- **Status:** Pending review

## BroadcastComposer scheduling + email/push — 2026-06-02
- **Spec required:** Optional schedule (date/time) and per-channel send (Push / In-app / Email).
- **Built instead:** Schedule toggle visible but no date/time picker; only In-app (Notification rows) is actually sent. Push and Email channel chips are UI-only.
- **Reason:** Push needs FCM credentials (P5 deployment); email needs SES/SendGrid; the scheduler needs a job queue. All out of C5 scope.
- **Status:** Pending review

## Sub-admin analytics charts — 2026-06-02
- **Spec required:** Rich AreaChart (growth) + BarChart (attendance).
- **Built instead:** Custom-painted lightweight area + bar charts (no fl_chart dependency).
- **Reason:** Avoid pulling a charting package mid-chunk; lightweight charts honor brand color + spec component shape.
- **Status:** Pending review

## AdminWizard step persistence — 2026-06-02
- **Spec required:** Each wizard step persists state (basics → branding → privacy → experience → first event → invites).
- **Built instead:** 6-step stepper UI with `SegmentedProgressBar`; per-step save calls a no-op `PATCH /communities/:cid` rather than the dedicated `POST /communities/:cid/onboard` (the endpoint exists but its body shape needs validator alignment with the wizard inputs).
- **Reason:** Wiring each step's exact body to the onboard validator is a follow-up; the stepper UX is in place and demoable.
- **Status:** Pending review

## CreateCommunity — 2026-06-02 (super-admin only)
- **Spec required:** Form to create a new community.
- **Built instead:** Form is built; POST hits `/api/v1/super/communities` (super-admin only). Non-super users see a guidance banner explaining the restriction.
- **Reason:** Spec marks role = `super_admin`. Bob (admin of Acme) can't create new communities on the platform — that's a super-admin gate.
- **Status:** Pending review

## AssignEventManager picker — 2026-06-02
- **Spec required:** Search + pick from community members.
- **Built instead:** Raw `userId` text input. Backend `POST /events/:eid/managers` accepts userId directly.
- **Reason:** Members directory + search lands properly when MemberList gets a search-with-suggestions affordance in C7.
- **Status:** Pending review

## RoleManagement promotion — 2026-06-02
- **Spec required:** Spec interactions for promote/demote/remove.
- **Built instead:** PopupMenuButton on each row with 4 role options. Remove omitted; uses existing `PATCH /communities/:cid/members/:uid`. Tap removes-from-role via "חזרה לחבר" (back to member).
- **Reason:** Remove is a separate DELETE action; menu is enough for demo.
- **Status:** Pending review

## BrandingCustomizer preview — 2026-06-02
- **Spec required:** Live preview of brand applied across the kit.
- **Built instead:** Color-tile preview only (no app-wide theme override).
- **Reason:** Hot-swapping the active ThemeData with a per-community palette requires a `BrandThemeOverride` provider that ripples through `commons.dart` — a non-trivial refactor better sequenced post-C7.
- **Status:** Pending review

## PlatformSettings persistence — 2026-06-02
- **Spec required:** Persisted toggles (maintenance mode + signup gate) + real Stripe key vault.
- **Built instead:** In-memory `_platformSettings` object in `super.controller.ts` survives only until the process restarts. Stripe key is `••••••••` placeholder.
- **Reason:** A real `PlatformSettings` collection + secret vault wiring deserves its own design pass and an audit trail; the demo screen is spec-aligned and PATCH /super/settings accepts the toggles in-memory.
- **Status:** Pending review

## SuperAdminDashboard dark theme — 2026-06-02
- **Spec required:** `"theme": "dark"` for super-admin surfaces.
- **Built instead:** Same light theme as the rest of the app, with a coral "Super Admin" pill badge for visual separation.
- **Reason:** A second ThemeData scoped to the super namespace requires the same `BrandThemeOverride` wiring as BrandingCustomizer. Single theme + role pill is the simpler tell-apart for v1.
- **Status:** Pending review

## SuspendCommunity reason logging — 2026-06-02
- **Spec required:** Reason saved alongside the suspension event.
- **Built instead:** Reason picker is in the UI, but `POST /super/communities/:cid/suspend` doesn't accept a reason field yet — the audit log records `community.suspend` without a reason payload.
- **Reason:** Need a `reason` field on the suspend endpoint + audit metadata change; defer until the audit-events viewer ships.
- **Status:** Pending review
## Offline screen — connectivity_plus not installed — 2026-06-02
- **Spec required:** Real `connectivity_plus` listener to drive the persistent reconnect banner.
- **Built instead:** Static "offline" visual: warning-wash banner with spinner, WifiOff blob, last-sync label using `DateTime.now()`. Reachable at `/offline`.
- **Reason:** Adding `connectivity_plus` is a dep change; the spec layout is what shipped, the live listener is a follow-up wiring task.
- **Status:** Pending review

## AppUpdateRequired — store URLs are placeholders — 2026-06-02
- **Spec required:** UpdateButton routes to the App Store / Play Store listing for the real app.
- **Built instead:** Placeholder URIs `apps.apple.com/app/id000000000` and `play.google.com/store/apps/details?id=com.communities.app`. Screen is correctly blocking (PopScope canPop:false, no back button, no dismiss).
- **Reason:** Real listing IDs don't exist yet — the screen is fully spec-aligned otherwise.
- **Status:** Pending review

## PrivacySettings persistence — 2026-06-02
- **Spec required:** Persisted privacy state; profile public-visibility honored across the app.
- **Built instead:** Local-only `StatefulWidget` state (visibility radio + 3 toggles). No `/me/privacy` endpoint exists yet; the BlockedMembers row is a no-op tap.
- **Reason:** Backend privacy model + visibility middleware is a separate workstream. The screen shape is wired to swap in a `privacy_repository.dart` once the API lands.
- **Status:** Pending review

## Edge-state routes bypass auth gate — 2026-06-02
- **Spec required:** Edge screens accessible regardless of auth state.
- **Built instead:** Added `edgeRoutes` set in `app_router.dart` redirect (`/404`, `/403`, `/error`, `/offline`, `/force-update`) returning `null` (no redirect) so unauthenticated users can hit them. `GoRouter.errorBuilder` falls back to `NotFoundScreen(attemptedPath: state.matchedLocation)` for any unknown path.
- **Reason:** These routes exist precisely to handle states where normal routing/auth breaks.
- **Status:** Pending review
