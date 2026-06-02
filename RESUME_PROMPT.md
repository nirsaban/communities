        # Resume prompt — design-locked Flutter + backend rebuild

        Paste the block below as your first message in the next Claude Code session.

        ---

        You're resuming a paused, design-locked Flutter + Express/Mongo rebuild of a multi-tenant community SaaS. The full plan and state were saved to memory before this session ended. **Before anything else, load context in this order:**

        1. Read `/Users/Nir.Saban/.claude/projects/-Users-Nir-Saban-communities/memory/MEMORY.md` and every file it points to. The critical ones are `project_state.md`, `build_plan.md`, `kit_conventions.md`, `demo_seed.md`, `backend_surface.md`, `prd_reading_order.md`.
        2. Read `/Users/Nir.Saban/communities/CLAUDE.md` for tenant-isolation, role, and stack invariants.
        3. Read `/Users/Nir.Saban/communities/mobile/lib/DESIGN_LOCK.md` for color/typography/spacing/radius tokens before writing any UI.
        4. Open `/Users/Nir.Saban/communities/mobile/design-specs/` and pull the JSON spec for whichever screen you're about to build. Match components, order, and spacing exactly.
        5. ToolSearch for `mobile` / `claude-in-mobile` — if the MCP tools surface, use them; if not, drive `emulator-5554` via adb at `/opt/homebrew/share/android-commandlinetools/platform-tools/adb` (export `ANDROID_HOME` + `PATH` first).

        **Where we stopped:** mid-Chunk C1 (Member core). 9 of 93 spec screens are already locked (Splash, LogIn, SignUp, ForgotPassword, ResetPassword, EmailVerification, OnboardingCarousel, ProfileSetup, InterestsSelector). The next move per `build_plan.md` is C1: HomeFeed, EventsList, EventDetail, EventsCalendar, RSVPConfirmation, WaitlistJoined, FullCapacityWaitlist, EmptyHomeFeed, EmptyEventsList — backed by a new `EventDto` + `EventRepository` + Riverpod providers on mobile (none exist yet — the existing `/home` is a placeholder with menu buttons).

        **Per-chunk procedure** (from `build_plan.md`):
        1. Read all spec JSONs for the chunk before coding.
        2. Extend backend if an endpoint is missing — routes → controller → service → model, Zod validators separate.
        3. Build Flutter screens against the locked kit imported from `mobile/lib/commons.dart` (DO NOT duplicate theme files under `core/theme/` — that bug already happened).
        4. Wire new routes in `mobile/lib/core/router/app_router.dart`; respect role guards.
        5. `flutter analyze && flutter test` must pass per chunk.
        6. Walk the happy path on the emulator, screenshot for sanity. Demo seed: `bob@example.com / BobPass123!` is in Acme Devs.
        7. Log technical-constraint deviations only (not stylistic shortcuts) in `mobile/docs/DESIGN_DEVIATIONS.md`.

        **Do not** restart the onboarding flow. **Do not** rebuild the theme/widget kit. **Do not** strip `android:usesCleartextTraffic="true"` from `mobile/android/app/src/main/AndroidManifest.xml` line 5 — it was added to fix the silent login failure on Android 28+.

        **Plan once, then execute in chunks.** Propose only the next chunk (start with C1) before diving in; check in with me after each chunk before proceeding to the next, unless I tell you to keep rolling.

        Then start C1. First step: scaffold `lib/data/models/event_dto.dart` and `lib/data/repositories/event_repository.dart` mirroring `Event.toClientJSON()` from `backend/src/models/Event.ts`.

        ---
