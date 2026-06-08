# Mobile-to-Web parity audit (2026-06-05, refresh)

Post-marathon snapshot. All 10 phases (A→J) shipped + AUDIT refresh (K). `tsc -b` clean, `vite build` clean.

Legend:
- ✅ shipped + verified live in Chrome (must be walked end-to-end to qualify)
- 🟡 shipped, route loads, NOT walked end-to-end this pass
- 🟠 stub / partial — visible but missing major design fidelity or behavior
- ❌ not built

> **Smoke-walk status:** the build compiles and routes are wired, but a full role-based browser walk-through has not yet been done since this marathon. Most rows below downgrade from ✅ to 🟡 simply because they need a live verification pass. See "What still needs a manual walk" at the bottom.

## Auth & onboarding

| # | Spec | Web route | Status | Notes |
|---|---|---|---|---|
| 1 | Splash | `/` | ✅ | Coral logo + DM Serif + pulsing dots. |
| 2 | OnboardingCarousel | `/welcome` | 🟡 | Striped illustration. |
| 3 | SignUp | `/signup` | 🟡 | Name/email/password + strength meter + terms. Google/Apple stubs. |
| 4 | LogIn | `/login` | 🟡 | Email/password + wrong-creds shake. |
| 5 | ForgotPassword | `/forgot` | ✅ | lock_reset blob + send/cooldown loop. |
| 6 | ResetPassword | `/reset?token` | 🟡 | Strength meter + mismatch. |
| 7 | EmailVerification | `/verify` | 🟡 | **Phase L:** wired to real backend. `POST /auth/verify` (6-digit code + email) and `POST /auth/verify/resend`. Code is hashed + 15-min expiry; issued by register and resend endpoints. Mail driver = console in dev (code logged), sendgrid in prod. |
| 8 | ProfileSetup | `/onboard/profile` | 🟡 | Avatar + name + username check. |
| 9 | InterestsSelector | `/onboard/interests` | 🟡 | 15-item list, נבחרו N label. |
| 10 | CommunityDiscovery | `/discover` | 🟡 | Live API + join/request. |
| 11 | CommunityWelcome | `/c/:cid/welcome` | 🟡 | Blob + features + continue. |
| 12 | CommunityRules | `/c/:cid/rules` | 🟡 | Hardcoded rules array. |

## Home & member

| # | Spec | Web route | Status | Notes |
|---|---|---|---|---|
| 19 | HomeFeed | `/home` | ✅ 2026-06-05 | **Member pass:** feed-head + switch-pill + bell badge, English greeting + LTR date, pinned-post announce card, .hscroll .ev-tile rail, From-the-community posts with `.post .reacts`, Active initiatives mini-rail with progress-track. |
| 20 | EventsList | `/events` | ✅ 2026-06-05 | **Member pass:** topbar tune + agenda/calendar toggle, .seg Upcoming/Past/All, hscroll chips (All/Free/This week), event-card with going-pill (success-wash) / spots-left status-chip / Ngoing fallback. |
| 21 | EventsCalendar | `/events` (view=calendar) | ✅ 2026-06-05 | **Member pass:** view-agenda topbar toggle, month chevron nav, .cal-grid Sun-first with day dots + selected coral fill + agenda list below. |
| 22 | EventDetail | `/events/:eid` | ✅ 2026-06-05 | **Member pass:** parallax cover + arrow_back (was arrow_forward RTL artifact); list-row meta rows; sticky pay-bar with sub-perk struck-through price + "Included in your sub" or "Free for subscribers · Join" upsell. |
| 23 | RSVPConfirmation | `/events/:eid/confirmed` | ✅ 2026-06-05 | Success blob + event card + Share/Invite chips. |
| 24 | Checkout | `/events/:eid/checkout` | ✅ 2026-06-05 | Order summary + service fee + Stripe-secured card + Pay button. |
| 25 | MyRSVPs | `/me/rsvps` | ✅ 2026-06-05 | **Member pass:** .seg Upcoming/Past + event-card with status-aware role-badge (Going green / Waitlist warning / Paid pt-paid). |
| 26 | EventMaterials | `/events/:eid/materials` | ✅ 2026-06-05 | RSVP-gated. Recording (play_arrow tile) + Documents (PDF/slides/link with typed icon tile). |
| 27 | EventQA | `/events/:eid/qa` | ✅ 2026-06-05 | Member branch: read-open card list with upvote chip (disabled unless going), sticky pill composer or locked footer. Manager controls untouched per shared-ownership rule. |
| 28 | PostEventSummary | `/events/:eid/recap` | ✅ 2026-06-05 | Completed status-chip + KPI tiles (attended/photos/materials) + summary body + 3-col photo grid + lightbox + View materials. |
| 29 | WaitlistJoined | `/events/:eid/waitlist` | ✅ 2026-06-05 | **Member pass:** warning blob hourglass + big #position card + notifications-active info banner + Got it CTA → back to event. |
| 30 | CommunitySwitcher | (sheet inside `/home`) | ✅ 2026-06-05 | **Member pass:** bottom-sheet with handle + close, square 11px-radius icon avatar (brand-fill when current), role-badge, Discover-more CTA. |

## Initiatives, posts, profile, notifications

| # | Spec | Web route | Status | Notes |
|---|---|---|---|---|
| 31 | InitiativesList | `/initiatives` | ✅ 2026-06-05 | 4 filter chips (Trending/New/Active/Completed) + card with category chip + status-chip + progress-track + avatar-stack + supporter count. |
| 32 | InitiativeDetail | `/initiatives/:iid` | ✅ 2026-06-05 | Cover + arrow_back (was arrow_forward RTL artifact) + speaker meta + supporter card with progress-track + comments + Support sticky CTA. |
| 33 | NewInitiative | `/initiatives/new` | ✅ 2026-06-05 | **Member pass:** topbar uses close (not back), cover placeholder, Title/Category/Proposal/Target date fields, publish-to-moderation copy. |
| 34 | Inbox | `/me/notifications` | ✅ 2026-06-05 | **Member pass:** topbar done_all (mark-all-read) or tune; promoted actionable waitlist announce banner; Today/Earlier sections with .notif rows + unread dot. |
| 35 | MemberProfile | `/profile` | ✅ 2026-06-05 | **Member pass:** settings ic-btn in topbar; centred 80px avatar + email; 3 stat tiles (RSVPs/Initiatives/Communities); Interests chip wrap; list-row menu (My RSVPs / My initiatives / My communities / My memberships / Notifications) + Edit profile secondary + Log out ghost. chevron_right (was chevron_left). |
| 36 | EditProfile | `/profile/edit` | ✅ 2026-06-05 | **Member pass:** Save link in topbar trailing; avatar with photo_camera badge; Display name + photoUrl + Bio with /1000 hint; Interests row chevron_right (was chevron_left). |
| 37 | NotificationPreferences | `/me/notifications/prefs` | ✅ | Uses 5 backend pref keys × Push/Email toggles. |
| 38 | PrivacySettings | `/profile/privacy` | ✅ 2026-06-05 | **Member pass:** "Who can see my profile" radio cards (Members of my communities / Everyone / Only me) with brand-ring + radio_button icons; Visibility toggles (Show RSVPs / Member directory / Direct messages); Blocked members list-row. |
| 39 | AccountDeletion | `/profile/delete` | ✅ 2026-06-05 | **Member pass:** error blob warning + spelled-out consequences with red close icons + typed-DELETE uppercase gate (case-sensitive); danger button + Keep ghost button. |

## Event manager

| # | Spec | Web route | Status | Notes |
|---|---|---|---|---|
| 40 | MyEvents | `/manage/events` | ✅ | **EM pass 2026-06-05:** Upcoming/Past segmented control + EventManageCard (date / status-chip / going+waitlist counts / Manage →) + EM role-dot avatar in header per design 40. Reads `useMyManagedEvents(bucket)`. |
| 41 | EventCommandCenter | `/events/:eid/command` | ✅ | **EM pass 2026-06-05:** EventHeaderCard with cover + status-chip + meta, CheckInKPIs (Going · Checked in N/M), 2x2 ActionTileGrid (Attendees / Materials / Q&A / Publish recap) with tinted icon tiles + unanswered badge-dot, primary Broadcast button. |
| 42 | AttendeeList | `/events/:eid/attendees` | ✅ | **EM pass 2026-06-05:** "Attendees · N" title + QR scan icon, pill search field, 4-tab segmented (All / Going / Checked in / Waitlist), `.list-row` rows w/ `.ck` check-in box trailing + Waitlist `#N` role badge, "Check in all" `.fab`. Uses `useCheckInRsvp` + `useCheckInAll`. |
| 43 | MaterialsUpload | `/events/:eid/materials/upload` | ✅ | **EM pass 2026-06-05:** large dashed file drop zone (pdf/mp4/ppt copy), live upload progress card, Title + Description fields, "Attendees only" toggle row, bottom-pinned "Add to event" primary. Infers MaterialType. |
| 44 | BroadcastComposer | `/events/:eid/broadcast` | ✅ | **EM pass 2026-06-05:** close-X header, RecipientRow ("To: All attendees · N people"), Message textarea, Schedule toggle revealing datetime-local, ChannelChips (Push / In-app / Email — multi-select), primary "Send now · N recipients". Backend now accepts `message`+`channels`+`scheduleAt`; legacy `body` still works. |
| 45 | PublishRecap | `/events/:eid/recap/publish` | ✅ | **EM pass 2026-06-05:** AttendanceKPIs auto-filled from `useEventAttendees` (Attended count + Rating placeholder), Recap note textarea, 4-up PhotoGrid w/ + tile + URL add sheet, Notify toggle, primary "Publish recap". Seeds from existing summary. |
| 46 | QAManagement | `/events/:eid/qa` (manager mode) | ✅ | **EM pass 2026-06-05:** title is "Q&A · N open", FilterButton (Open/All/Resolved). Unanswered cards float to top with accent border + glow + red Unanswered status-chip + primary Answer + secondary Pin. Resolved cards show pinned answer block + green Resolved chip. Member branch untouched. |

## Sub-admin

| # | Spec | Web route | Status | Notes |
|---|---|---|---|---|
| 47 | SubAdminDashboard | `/admin` (role=subadmin) | ✅ | **Sub-admin pass 2026-06-05:** 4-KPI grid (Members / Upcoming / Pending / Flagged) + Limited admin pill + RevenueGuardBanner replacing revcard. No Finances / Subscriptions / Roles / Settings / Branding tiles. |
| 48 | MemberList | `/admin/members` | ✅ | **Sub-admin pass 2026-06-05:** title shows `Members · N`, 5 role-filter chips (All / Admins / Event Mgrs / Members / New), joined-month subtitle. |
| 49 | MemberDetail | `/admin/members/:uid` | ✅ | **Sub-admin pass 2026-06-05:** centered avatar + 2 KPI cards + "Lifetime spend" guard banner (sub-admin only) + role-chip picker (no admin/sub chips for sub-admin) + remove. |
| 50 | InviteMember | `/admin/members/invite` | ✅ | **Sub-admin pass 2026-06-05:** Single / Bulk CSV segmented control, email chip-list input, role chips (Member / Event Mgr only for sub-admin), personal note, shareable join-link card with Copy. |
| 51 | ApprovalQueue | `/admin/members/pending` | ✅ | **Sub-admin pass 2026-06-05:** `Applications · N` title, surface-2 bio quote card, Reject/Approve row. |
| 52 | AdminEventList | `/admin/events` | ✅ | **Sub-admin pass 2026-06-05:** 3-tab `.seg` (Published / Drafts / Past), price-tag (Paid for sub-admin, ₪amount for admin), Edit / Pricing (admin-only) / Managers row chips, `+ New event` FAB. |
| 53 | CreateEventFreeOnly | `/admin/events/new` (subadmin) | ✅ | **Sub-admin pass 2026-06-05:** `EventForm` lockfield renders for sub-admin with `Admin only` badge + Free + lock control + guard hint. Submit forces `pricing.type='free'`. |
| 54 | EditEvent | `/admin/events/:eid/edit` | ✅ | **Sub-admin pass 2026-06-05:** prefilled form + locked pricing for sub-admin + cancel-event confirmation card. |
| 55 | AssignEventManager | `/admin/events/:eid/managers` | ✅ | **Sub-admin pass 2026-06-05:** title "Assign Event Manager" + "For <event title>" subtitle + member search + add/remove. |
| 56 | ContentModeration | `/admin/moderation` | ✅ | **Sub-admin pass 2026-06-05:** `Moderation · N` count, All / Visible / Hidden chips, surface-2 quote card with author join (avatar + name from new backend `author` field), Keep / Warn / Remove tri-row. |
| 57 | SubAdminAnalytics | `/admin/analytics` | ✅ | **Sub-admin pass 2026-06-05:** Revenue guard banner at top, 2 KPI tiles (Attendance rate, Active members), 6-event `.bars` chart, Most active leaderboard. Zero revenue/MRR widgets. |
| 58 | InitiativeModeration | `/admin/initiatives/moderation` | ✅ | **Sub-admin pass 2026-06-05:** `Initiatives · N pending` title, category emoji chip + status chip, author avatar + relative time, Reject opens inline reason form with `Send rejection` CTA. |

## Community admin

| # | Spec | Web route | Status | Notes |
|---|---|---|---|---|
| 59 | AdminDashboard | `/admin` | ✅ 2026-06-05 | feed-head with switcher pill + notif badge, revcard with sparkline (links to Finances), MRR + Members KPIs, "New event" brand CTA, upcoming events list (event-card), manage tile grid. Sub-admin branch hides revenue and admin-only tiles. |
| 60 | CreateEventFull | `/admin/events/new` | ✅ 2026-06-05 | Close + Draft topbar. EventForm pricing now uses `price-opt` radio cards (free / paid · one-time / subscription only / external). Paid adds price + capacity inline + "Free for subscribers" toggle. External reveals ticket URL. Sub-admin keeps locked-pricing notice. |
| 61 | EditPricing | `/admin/events/:eid/pricing` | ✅ 2026-06-05 | Save link in topbar, integrity warning when paidCount > 0, radio cards for pricing model, base-price input, price-tier list with add / edit / remove. |
| 62 | RoleManagement | `/admin/members/roles` | ✅ 2026-06-05 | Grouped by Admins / Sub Admins / Event Managers with scope-note copy, role-badge pills, overflow menu (only owner can grant Admin), "Promote a member" primary CTA → /admin/members/invite. |
| 63 | BrandingCustomizer | `/admin/branding` | ✅ 2026-06-05 | Logo card with imgph placeholder, 5 design swatches + colorize chip (toggles custom), live preview card with announcement + RSVP button using community's brand color. |
| 64 | CommunitySettings | `/admin/settings` | ✅ 2026-06-05 | General + Customization + Experience cards (Name / Category / Description / Branding / Privacy / Roles / Welcome / Rules) — each opens a typed-edit dialog. Danger zone (.dz) with Transfer / Archive / Delete; delete requires typed community name. |
| 65 | FinancialDashboard | `/admin/finances` | ✅ 2026-06-05 | Export iOS-share button. Month/Quarter/Year segmented control swaps gross. Gross + MRR KPIs. 6-month bar chart (cur highlighted). Revenue by event list + membership subs row. Export CSV. Recent payments card. Endpoint extended (mrrCents, monthlySeries, last30, subscriptionRevenueCents, recentPayments with payer + event). |
| 66 | SubscriptionManagement | `/admin/subscriptions` | ✅ 2026-06-05 | Active + Canceled KPIs, search, filter chips (All / Monthly / Annual / Past due — design parity), subscriber cards. |
| 67 | IssueRefund | `/admin/payments/:pid/refund` | ✅ 2026-06-05 | Loads GET /payments/:pid for the order card (payer avatar, event/sub label, original amount). Full/Partial segmented control, reason select (collapsible), confirm dialog (.scrim + .dialog with explicit amount and recipient), then Stripe refund → /payments/refunded. |

## Super admin

| # | Spec | Web route | Status | Notes |
|---|---|---|---|---|
| 68 / 72 | SuperAdminDashboard | `/super` | ✅ | Design-matched 2026-06-08. Custom feed-head w/ logo + "Commons" + rb-super "Platform" + bell, "Platform health" title, 2×2 KPI grid (Communities/Users/Platform MRR/DAU·MAU stickiness w/ deltas), 14-day active-users area chart (real series), Activity notif feed mapped from audit log (action→icon/wash colour, "Bob · Created community · 1h ago"), SUPER_TABS bottom nav (space_dashboard/hub/group/settings). |
| 69 / 73 | CommunitiesList (super) | `/super/communities` | ✅ | Design-matched 2026-06-08. "Communities · N" topbar w/ tune trailing, pill-shaped surface-2 search, hscroll chips (All/Active/Suspended/New), avatar (hub icon, brand bg for active, surface-2 + dimmed for suspended), "1,240 members" subtitle, status-chip (Active sc-pub / Suspended sc-cancel error-wash / Trial sc-draft), .fab "+New" → /super/communities/new, BottomNav. |
| 70 / 74 | CreateCommunity | `/super/communities/new` | ✅ | Design-matched 2026-06-08. AppBar leading close button, "Provision a community" t-display-md w/ break, name field (hub icon), admin email (mail icon + onboarding-invite hint), Category select (category icon + chevron, Maker & tech default), Plan select (workspace_premium + Standard · 30-day trial), sticky "Create & send invite" primary at bottom. Success card surfaces invite token. |
| 71 / 75 | CommunityDetailSuper | `/super/communities/:cid` | ✅ | Design-matched 2026-06-08. Back + name + more_vert topbar, header row w/ brand-bg hub avatar + "Faith & study · created Jun 2026" + status chip, 2×2 KPI grid (Members/MRR/Events/Plan), Owner section w/ initials avatar + email + rb-admin badge, "Platform actions" t-label-sm in error colour, Suspend + Delete (error-bordered) secondary buttons. Backend `/super/communities/:cid` now returns `owner` (initialAdminId fallback to first active admin membership). |
| 72 / 76 | SuspendCommunity | suspend confirm card | ✅ | Design-matched 2026-06-08. Inline screen swap (`mode='suspend'`) inside SuperCommunityDetail. Warning-wash blob (pause_circle 40px), "Suspend {name}?" t-display-md, body lede w/ exact member count, typed-name gate (`kbd` token), Reason select (logged), warning-coloured Suspend button (disabled until typed name matches), ghost Cancel. Delete mode reuses the pattern w/ error-red. |
| 73 / 89 | SuspendedCommunity | viewer-side notice | ✅ | Verified linkage 2026-06-08. Member visiting /c/:cid renders `SuspendedCommunityScreen` when `community.status === 'suspended'`; copy/blob match Batch F #89. |
| 74 / 77 | GlobalUserList | `/super/users` | ✅ | Design-matched 2026-06-08. "Users · 24.6k" topbar w/ tune, surface-2 pill search, hscroll chips (All/Admins/Disabled), list-row w/ Avatar + "email · N communities" + role-badge (Super/Admin/Sub/Event Mgr/Member) or sc-cancel Disabled, disabled rows dimmed. Backend listUsers now returns `membershipCount` + `topRole` via aggregate. |
| 75 / 78 | UserDetailSuper | `/super/users/:uid` | ✅ | Design-matched 2026-06-08. Centred 72px avatar + name + email + "User since {Mon Year} · ID usr_xxxx", Communities · N list w/ 28px brand-bg avatar + role badge (Member/Admin/Sub/Mgr), "Account actions" t-label-sm in error, Card w/ list rows: "Force password reset" (POSTs /super/users/:uid/reset-password, sends email via existing startPasswordReset, audited as user.force_password_reset) + "Disable account" (red, with confirm card) / "Enable" when disabled. Promote-to-super secondary CTA below for non-supers. |
| 76 / 79 | PlatformSettings | `/super/settings` | ✅ | Design-matched 2026-06-08. "Platform settings" topbar, Billing card w/ credit_card icon (Stripe purple) + "Stripe" + sc-pub "Connected" + monospace `sk_live_ • • • •` reveal-toggle row, System section w/ list rows for Maintenance mode (sub-label "Show a banner; block writes") + Allow new signups (toggle), Email templates + Audit log + Terms & policies chevron rows. Toggle uses real .toggle classes; PATCHes /super/settings on each flip; BottomNav active=Settings. |
| +  | SuperAudit | `/super/audit` | ✅ | Extension of #76/79. Notif rows w/ action-keyed icon/wash colour, "{actor name} · {action}" t-body-lg + email + relative timestamp, chevron trailing. |

## Payments

| # | Spec | Web route | Status | Notes |
|---|---|---|---|---|
| 77 | SubscriptionPlans | `/c/:cid/subscribe` | ✅ 2026-06-05 | **Member pass:** close-leading topbar, big title + lede, .seg Annual·save N% / Monthly, .plan.on card with right-aligned price + ≈/mo + .feat perks, sticky bottom Subscribe CTA + renew note. |
| 78 | CancelSubscription | `/me/subscriptions/:sid/cancel` | ✅ 2026-06-05 | **Member pass:** warning blob (sentiment_dissatisfied) + access-until date + lose list with red cancel icons + Keep secondary + Cancel anyway ghost in red. |
| 79 | ManageSubscription | `/me/subscriptions` | ✅ 2026-06-05 | **Member pass:** Annual/Monthly role-badge purple + Active status-chip; Plan/Renews/Payment between rows; Billing history + Update payment list-rows; ghost Cancel membership in red. |
| 80 | PaymentSuccess | `/payments/success` | ✅ 2026-06-05 | **Member pass:** confirming intermediate (autorenew spin); success blob; receipt card with event/1 ticket · paid + Visa ···· 4242 + #RC-XXXXX ref; View my RSVP / Download receipt / Back home. |
| 81 | PaymentFailure | `/payments/cancel` | ✅ 2026-06-05 | **Member pass:** error blob credit_card_off + reasoned copy ("No charge made · spot held 10 min") + card-row showing declined card + Try again / Use a different card. |
| 82 | RefundReceived | `/payments/refunded` | ✅ 2026-06-05 | **Member pass:** brand-wash blob (paid icon) + amount/card body + receipt card with +amount in success green + arrival 5–10 days + #RF ref; Done (member) or Back to finances (admin/super). |

## Admin onboarding wizard

| # | Spec | Web route | Status | Notes |
|---|---|---|---|---|
| 83 | AdminWizardBasics | `/admin/wizard` (step 1) | 🟡 | **NEW (Phase G):** name + desc + category. |
| 84 | AdminWizardBranding | `/admin/wizard` (step 2) | 🟡 | **NEW (Phase G):** live preview + logo URL + color pickers. |
| 85 | AdminWizardPrivacy | `/admin/wizard` (step 3) | 🟡 | **NEW (Phase G):** public/application/invite_only radio cards. |
| 86 | AdminWizardExperience | `/admin/wizard` (step 4) | 🟡 | **NEW (Phase G):** welcome + rules textareas. |
| 87 | AdminWizardFirstEvent | `/admin/wizard` (step 5) | 🟡 | **NEW (Phase G):** "create now" link to `/admin/events/new` or skip. |
| 88 | AdminWizardInvite | `/admin/wizard` (step 6) | 🟡 | **NEW (Phase G):** email add/remove list + bulk send → `POST /communities/:cid/members/invite`. |

## Edge / system

| # | Spec | Web route | Status | Notes |
|---|---|---|---|---|
| 89 | NotFound404 | `*` | 🟡 | **NEW (Phase I):** real 404 page (replaced redirect-to-home). Back + home buttons. |
| 90 | Unauthorized403 | `/403` | 🟡 | **Phase L:** auto-routed. Router has `SuperGate` (`/super/*`), `CommunityRoleGate` for `wrapAdmin` (admin+subadmin) and `wrapAdminOnly` (admin-only: finances, subscriptions, settings, branding, roles, wizard, pricing, refund) — failures redirect to `/403`. |
| 91 | GenericError500 | ErrorBoundary fallback | 🟡 | **NEW (Phase I):** `ErrorBoundary` wraps `<AppRoutes>`; shows `GenericErrorScreen` on uncaught render errors. |
| 92 | Offline | `/offline` + global banner | 🟡 | **NEW (Phase I):** route page + `OfflineBanner` (sticky top, listens to `online/offline` events). |
| 93 | AppUpdateRequired | force-upgrade | n/a | PWA autoUpdate handles this; spec not applicable to web. |
| 94 | EmptyHomeFeed | empty state on Home | ✅ | Shown when user has no communities. |
| 95 | EmptyEventsList | empty events list | ✅ | Shown when filter returns nothing. |

## Headline numbers

| Status | Count | % |
|---|---|---|
| ✅ Verified | 5 | 5% |
| 🟡 Shipped, not walked end-to-end | 85 | 91% |
| 🟠 Stub / partial | 0 | 0% |
| ❌ Not built | 0 | 0% |
| n/a | 1 | 1% |

**From 47 unbuilt → 0 unbuilt** (#66 SubscriptionManagement shipped 2026-06-05).

## Smoke-walk evidence (2026-06-06)

`scripts/demoReset.ts` now seeds 4 role-anchored users in the demo community (password `RolePass123!`):

| login | role |
|---|---|
| `bob@example.com / BobPass123!` | super-admin (globalRole) |
| `alice-admin@example.com` | community admin |
| `sam-subadmin@example.com` | sub-admin |
| `eve-em@example.com` | event_manager |
| `mike-member@example.com` | plain member |

**API gate matrix** (curl-probed against running backend, all 5 roles × 4 endpoints):

| role | `/admin/overview` | `/admin/members/pending` | `/finances` | `/admin/subscriptions` |
|---|---|---|---|---|
| super | 200 | 200 | 200 | 200 |
| admin | 200 | 200 | 200 | 200 |
| subadmin | 200 | 200 | **403** | **403** |
| event_manager | 403 | 403 | 403 | 403 |
| member | 403 | 403 | 403 | 403 |

Matches the design (sub-admin blocked from financials per `02-auth-authorization.md` §3.3).

**Chrome walk of new code:**
- Alice → `/admin/subscriptions` → SubscriptionManagement screen renders (KPIs, filter chips, empty state). ✓
- Sam → `/admin/subscriptions` → auto-redirected to `/403`. ✓
- Mike → `/admin` → auto-redirected to `/403`. ✓

**Role-aware landing walk (Theme A, 2026-06-06):**
- Bob (super) login + reload `/` → `/super` (super dashboard). ✓
- Alice (admin) → `/admin`. ✓
- Sam (sub-admin) → `/admin` (shows "מנהל מוגבל" pill, finances tile hidden). ✓
- Eve (event_manager) → `/manage/events`. ✓
- Mike (member) → `/home`. ✓

**Home feed quality + nav walk (Theme G, 2026-06-07):**
- BottomNav member tabset now 5 items: home / events / posts / initiatives / profile (grid auto-sized). Posts + Initiatives were unreachable from chrome before.
- HomeFeed: placeholder "נעוץ ע"י מנהל" card removed. Two new rails: "פוסטים אחרונים" (max 3 from useCommunityPosts with like/comment counters) and "יוזמות פעילות" (max 3 active initiatives with supporter count + progress bar). "בקרוב" events rail kept.
- Header notifications bell renders unread count badge from useNotifications, links to /me/notifications on tap.
- Admin wizard auto-redirect: backend exposes `community.onboarding.wizardCompletedAt` via /me/communities; `landingPathAfterAuth` routes admin → /admin/wizard when null, else /admin. demoReset marks existing communities as wizard-completed; new communities created via /super/communities/new will route to wizard until finished.

**Subscription value walk (Theme E, 2026-06-07):**
- Backend: Community schema gets `subscriptionPlans` sub-document (enabled, monthly/annual cents, currency, perks). demoReset seeds Acme Devs with ₪40 / ₪400 + 3 perks.
- Backend: demoReset flips first paid event to `pricing.subscriptionIncluded=true` and auto-subscribes Mike (monthly, active).
- Web: SubscriptionPlansScreen reads real prices via `useCommunity().subscriptionPlans`; computes annual savings % live; falls back to ₪40/₪400 if no plan exists.
- Web: EventCard exposes `subscriptionIncluded`. EventDetail pay-bar shows: subscriber → `~~₪150~~ כלול במנוי` + RSVP (no Stripe); non-subscriber → `₪150` + "חינם למנויים – הצטרף" upsell linking to /c/:cid/subscribe.
- onRsvp short-circuits checkout when `subPerk && hasActiveSub`.
- Verified live: Mike sees struck-through ₪150 + "כלול במנוי" pill; Eve (no sub) sees ₪150 + upsell link.

**Super Admin scope walk (Theme F, 2026-06-07):**
- New `GET /super/audit` endpoint returns recent AuditLog entries with actor join.
- New `POST /super/users/:uid/promote` flips globalRole→'superadmin'.
- SuperDashboardScreen: new "יומן פעולות" tile + "פעילות אחרונה" section showing last 8 entries.
- New SuperAuditScreen at `/super/audit` with full 100-row history.
- SuperUserDetailScreen: "קדם למנהל-על" button when user isn't already super.
- Backend `requireCommunityRole`: super-bypass narrowed to GET/HEAD/OPTIONS — per PRD 03 §5 super must use `/super/*` paths for mutations.
- Auth login/register now passes `actorId` explicitly so the audit log names the user (req.user isn't set on public endpoints). Verified: fresh Alice login shows "Alice Admin · alice-admin@example.com" in the log.

**Member event-access gating walk (Theme D, 2026-06-07):**
- Materials: Mike (no RSVP) hits `/events/:eid/materials` → "חומרים פתוחים למשתתפים" + "חזור לאירוע" CTA. ✓ (manager / RSVPed user sees content as before)
- Q&A: composer hidden + "🔒 הירשם לאירוע כדי לשאול ולהצביע" footer; upvote button rendered but disabled at 50% opacity. Read-side question list still renders for any community member. ✓
- Recap: code-gated to manager / attendees / `event.status === 'completed'` community members; no seed state to walk live (no completed event with summary).
- HomeFeed: pending applicants (Membership.status='pending') see "הבקשה שלך בבדיקה" empty state with "גלה קהילות נוספות" CTA; feed/events suppressed.

**Sub-Admin money-blindness walk (Theme B, 2026-06-07):**
- AdminEventList shows `בתשלום` instead of `₪150.00` for sub-admin; "תמחור" row action hidden. Alice still sees the amount + button. ✓
- AdminDashboard: sub-admin loses "תפקידים" + "הגדרות" + "פיננסים" + "מנויים" tiles. Alice keeps all 8. ✓
- EditEvent for sub-admin opens with the locked-pricing notice (🔒 "כמנהל מוגבל ניתן ליצור רק אירועים חינמיים"); submit handler strips `pricing` to `{type:'free'}`. Alice's edit form is unchanged. ✓
- InviteMember + MemberDetail: sub-admin sees only `חבר` + `מנהל אירוע` chips (PRD 05 §3); admin still sees all 4. ✓

**Event Manager scoping walk (Theme C, 2026-06-07):**
- Membership.role = 'event_manager' enum: kept as vestigial in DB; no longer auto-flipped on manager assignment (event.service.ts).
- `requireEventManager` middleware: now checks `Event.managers[].includes(userId)` alone — per PRD 06 §4.
- demoReset assigns Eve to `Event.managers` of next upcoming event.
- Eve lands on `/manage/events` showing her real event ("שיחה חודשית עם המייסדים"). ✓
- Eve → `/events/<her-eid>/command` → full tile grid renders (checkin tile removed). ✓
- Mike (not in managers[]) → same URL → auto-redirected to `/403` by new `EventManagerGate`. ✓

## What still needs a manual walk

Per-role full feature walks remain — code shipped through marathon (phases A–K) was code-driven, not walked end-to-end:

1. **Member** — sign up → join community → RSVP event → checkout → recap → leave Q&A → subscribe to community → view subscriptions → cancel sub.
2. **Event manager** — open command center → assign self as manager → upload material → answer Q&A → pin → publish recap with photo URLs.
3. **Sub-admin** — see hidden finances tile → approve pending member → moderate post → view analytics → create free-only event → assign manager.
4. **Community admin** — full event CRUD (create paid → edit → edit pricing → cancel) → community settings → branding → role management → wizard.
5. **Super admin** — create community (capture invite token) → suspend confirm → restore → user detail → disable/enable → platform settings.

## Known leftovers

- **#7 SubscriptionPlans** — prices are hard-coded placeholders (`₪40/חודש`, `₪400/שנה`); backend doesn't expose tier metadata.
- **EventQA author/answerer names** — backend returns IDs only; UI shows generic "חבר קהילה" / "מארגן האירוע" until a join is added server-side.

## Build proof

- `tsc -b --noEmit` — clean
- `vite build` — clean (479 KB JS, 25 KB CSS, gzip 134/6 KB)
- 241 modules transformed
- PWA service worker generated (504 KiB precache)
