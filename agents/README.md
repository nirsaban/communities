# Role agents

This folder holds the per-role implementation agents for the community SaaS. Each file is the **scope contract** for one role — its persona, screens, endpoints, invariants, and how to verify it works.

## Files

| File | Owner | Scope |
|---|---|---|
| [`super-admin.md`](super-admin.md) | Bob (platform operator) | `/super/*` + platform-wide endpoints |
| [`community-admin.md`](community-admin.md) | Alice (community CEO) | `/admin/*` incl. financial surface |
| [`sub-admin.md`](sub-admin.md) | Sam (money-blind deputy) | `/admin/*` minus all financials |
| [`event-manager.md`](event-manager.md) | Eve (per-event grant) | `/manage/events` + `/events/:eid/{command,attendees,broadcast,materials/upload,recap/publish}` |
| [`member.md`](member.md) | Mike (the citizen) | `/home`, `/events`, `/initiatives`, `/posts`, `/me/*`, `/profile/*`, `/c/:cid/subscribe`, `/payments/*` |
| [`e2e-flows.md`](e2e-flows.md) | Cross-role | End-to-end journeys that span roles |

## Demo logins (after `npm run demo:reset` in `backend/`)

| Role | Email | Password |
|---|---|---|
| Super admin | `bob@example.com` | !` |
| Community admin | `alice-admin@example.com` | `RolePass123!` |
| Sub-admin | `sam-subadmin@example.com` | `RolePass123!` |
| Event manager | `eve-em@example.com` | `RolePass123!` |
| Member | `mike-member@example.com` | `RolePass123!` |

Web: `http://localhost:5174` · Backend: `http://localhost:4242`

## How agents are invoked

Two surfaces:

1. **Slash commands** — `/role-walk super`, `/role-walk admin`, `/role-walk subadmin`, `/role-walk em`, `/role-walk member`, `/role-walk e2e`. These live in `.claude/skills/role-walk/` and spawn the matching Claude Code subagent.
2. **Direct Claude Code agent invocation** — agents are registered in `.claude/agents/<name>.md` with frontmatter. They can be picked up by the Agent tool when their description matches the task.

## API test dashboard

`backend/scripts/apiTestDashboard.ts` runs every API smoke test in this folder and renders a static HTML report at `backend/dist/api-test-report.html`. Run it:

```bash
cd backend
npm run test:api-dashboard
```

It walks every endpoint per role, asserts gates, and surfaces pass/fail with timings. Open the HTML file in a browser for a colour-coded scoreboard.
