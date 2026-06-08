---
name: role-walk
description: Spawn the dedicated role agent to walk a specific role (super / admin / subadmin / em / member / e2e) end-to-end and fix any bugs it finds. Usage examples — "/role-walk super", "/role-walk admin", "/role-walk subadmin", "/role-walk em", "/role-walk member", "/role-walk e2e". The agent reads its scope contract from `agents/<role>.md`, walks every screen and endpoint in that scope, and surfaces a concise report.
---

# Role walk

You're invoking the per-role implementation agent. The argument selects which one:

| Arg | Agent | Reads |
|---|---|---|
| `super` | `super-admin` | `agents/super-admin.md` |
| `admin` | `community-admin` | `agents/community-admin.md` |
| `subadmin` | `sub-admin` | `agents/sub-admin.md` |
| `em` | `event-manager` | `agents/event-manager.md` |
| `member` | `member` | `agents/member.md` |
| `e2e` | `e2e-flows` | `agents/e2e-flows.md` |

## How to handle the invocation

1. Parse the arg from `$ARGUMENTS` (or the conversation context if no arg).
2. Spawn the matching subagent via the Agent tool with `subagent_type` set to the agent name above.
3. Pass a prompt that:
   - Tells the agent its scope doc lives at `agents/<role>.md`.
   - Authorises it to read, edit, run typecheck + build, and probe the live backend.
   - Asks it to walk every screen + endpoint in its scope, fix bugs, and report.

## After the agent returns

Summarise the agent's report in 5–8 lines for the user. If the agent found unfixed issues, surface them. If everything passed, confirm with the role + the screens walked.

## Constraints

- If no arg is given, ask the user which role to walk (or default to `e2e`).
- If the arg doesn't match the table, list the valid args and ask the user to choose.
- The backend at `:4242` and web at `:5174` are assumed already running — don't spawn duplicates.
