# Mission Control

Local-only internal devtool for the Community SaaS. Three tabs:

- **System** — auto-generated map of routes, models, services, jobs, env, and the architectural invariants from `CLAUDE.md`.
- **Monitor** — live health, DB state, request rate / p95 latency / error rate, Mongo collection counts, log tail.
- **E2E** — clickable scenarios (auth, community, event, RSVP, errors) that hit your local backend and stream pass/fail results.

This is **not** part of the product surface. PRD §4 bans web dashboards in v1; this lives outside `backend/` and `mobile/` and is for development only.

## Quickstart

```sh
# from repo root, one-time
cd dashboard && npm run setup

# start everything (backend must be running separately on :3000, mongo on :27017)
npm run dev
```

Then open <http://localhost:5173>.

`npm run dev` runs:
- `server/` (BFF, Express on `:4000`)
- `web/` (Vite on `:5173`, proxies `/api` → `:4000`)

## Architecture

```
browser  ─►  Vite (:5173)  ─►  BFF Express (:4000)  ─►  Backend (:3000)
                                                    └►  Mongo (:27017) via mongoose
```

The BFF is the *only* thing that talks to Mongo or the backend directly. The browser only ever talks to the BFF. This keeps Mongo creds out of the bundle and lets the BFF own SSE streams for metrics/logs/E2E.

## Backend metrics (optional)

To see *real* request-rate / latency / error counters in the Monitor tab, set
`DASHBOARD_METRICS=1` in `backend/.env` and restart the backend. This mounts a
read-only `/api/v1/__dashboard/metrics` endpoint with an in-memory ring buffer.
Without this flag, the Monitor tab still shows health + DB stats, but the
rate/latency charts will be empty.

## E2E scenarios

Each scenario is a sequence of HTTP calls + assertions. They run against your
local backend, so make sure the demo seed is loaded (`npm run demo:reset` in
`backend/`) before clicking Run. The runner streams every step's status,
duration, and response body via SSE.

Scenarios live in `server/src/scenarios/`. Adding a new one is one file.
