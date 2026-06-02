# Design Deviations

Strict format. Every divergence from `/mobile/DESIGN_LOCK.md` or
`/mobile/design-specs/*.json` MUST be logged here. Aesthetic preference is not
a valid reason to deviate — only technical constraints.

---

## Entries

### 2026-06-01 — Locked kit lives at `lib/theme/` + `lib/components/`, not `lib/core/theme/`

| Field | Value |
|---|---|
| Component | All design-system files |
| Spec said | Kickoff instruction: "Confirm /mobile/lib/core/theme/ has AppColors, AppTypography, AppSpacing, AppRadius" |
| Built as | The pre-existing locked kit lives at `lib/theme/` (`AppColors`, `AppTypography`, `AppPalette`, `AppSpacing`, `AppRadius`, `AppShadows`, `AppDuration`) and `lib/components/` (`AppButton`, `AppTextField`, `EventCard`, `MemberAvatar`, `RoleBadge`, `PriceTag`, `StatusChip`, `EmptyState`, `ErrorState`, `LoadingShimmer`, `SectionHeader`). Exported via `lib/commons.dart`. New screens import `package:community_app/commons.dart`. |
| Why (technical only) | The kickoff path `/mobile/lib/core/theme/` was a typo for the existing `/mobile/lib/theme/`. Generating duplicates there would have created a second source of truth. Per the kickoff "design system (already coded)", the kit at `lib/theme/` IS the locked design system. |

### 2026-06-01 — Wired `google_fonts` into `lib/theme/app_typography.dart`

| Field | Value |
|---|---|
| Component | `lib/theme/app_typography.dart` |
| Spec said | "AppTypography display: DM Serif Display / body: DM Sans" + the file's own comment block instructed declaring the families in `pubspec.yaml fonts:` block (with bundled TTF assets). |
| Built as | The class still exposes `display` / `sans` family-name constants and the same eight `TextStyle` roles, but each `TextStyle` is constructed via `GoogleFonts.dmSerifDisplay(...)` / `GoogleFonts.dmSans(...)` instead of `TextStyle(fontFamily: ...)`. |
| Why (technical only) | No TTF files were shipped with the project (no `assets/fonts/` directory exists). Without this patch every text widget falls back to the system sans-serif, defeating the locked typography. The file's own docstring lists "or swap these two lines for GoogleFonts" as an accepted alternative. Identical glyphs, weights, letter-spacings preserved. |

### 2026-06-01 — DESIGN_LOCK.md says `AppButton height ≥ 52`, locked kit's `AppButton` uses 50

| Field | Value |
|---|---|
| Component | `lib/components/app_button.dart` (locked) |
| Spec said | `DESIGN_LOCK.md`: "AppButton height: 52px, never less" |
| Built as | Existing locked `AppButton` uses `height = 50` (regular) / `38` (small). Screens consume `AppButton(...)` rather than passing a height override. |
| Why (technical only) | The locked component is part of "design system (already coded)" per the kickoff. Changing 50 → 52 would modify the locked kit. DESIGN_LOCK.md and the locked component disagree by 2px; the kit takes precedence because it is the actual code path. Documented here so the next design review can resolve it in ONE place. |

### 2026-06-01 — `AppRole` enum is reused from `lib/components/badges.dart`

| Field | Value |
|---|---|
| Component | `lib/core/auth/` |
| Spec said | Kickoff: "wrap any admin-only widget with RoleGuard(roles: [...])". Implies a role enum. |
| Built as | `RoleGuard`, `AdminOnly`, `FinancialAccessGuard`, `currentRoleProvider`, `isAdminProvider`, `isBlockedFromFinancialProvider` live in `lib/core/auth/`. They reference `AppRole` re-exported from `lib/commons.dart` (originally declared in `lib/components/badges.dart`). Backend-token → enum parsing lives in `lib/core/auth/role_parser.dart`. |
| Why (technical only) | The locked kit already declared `enum AppRole { admin, subAdmin, eventManager, member, superAdmin }`. Declaring a second one in `core/auth/` would shadow it and break `MemberAvatar` / `RoleBadge`, which consume the locked enum. Reusing is the only non-breaking option. |
