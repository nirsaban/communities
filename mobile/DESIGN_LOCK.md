# Design Lock — DO NOT MODIFY WITHOUT DESIGN REVIEW

## Enforced by Claude Code on every task

This file is the source of truth for all UI decisions.
Claude Code must check this file before touching any widget.

### Token Reference
- Primary accent: #FF5C35 (light) / #FF7A52 (dark)
- Background: #FAFAF7 (light) / #0F0F0F (dark)
- Surface: #FFFFFF (light) / #1A1A1A (dark)
- Typography display: DM Serif Display
- Typography body: DM Sans
- Base radius: 12px
- Page padding: 16px horizontal

### Component Constraints
- AppButton height: 52px, never less
- EventCard image ratio: 16:9
- MemberAvatar sizes: 32 / 40 / 48 / 64px only
- BottomNav height: 64px + safe area
- All icons: Material Symbols Rounded, size 24px

### Role-Gating Rules
- Sub Admin: NEVER show /finances/* routes or revenue numbers
- Member: NEVER show admin chrome (FABs, role badges, moderation tools)
- Event Manager: NEVER show events they are not assigned to

### Screen Inventory
See /mobile/design-specs/*.json — one file per screen.
Every screen listed there must match its spec exactly.