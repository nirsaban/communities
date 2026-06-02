# Demo guide

End-to-end test walkthrough for the Community Management SaaS. Hits every
phase (P0–P5) via the Hebrew RTL mobile app running on an Android emulator,
backed by the live API + Mongo replica set.

---

## Boot the whole stack

```bash
./infra/dev-up.sh
```

That single command:
1. Starts MongoDB (replica set rs0) if not already running.
2. Starts the backend API on `http://localhost:3000` (logs → `infra/.run/logs/backend.log`).
3. Boots the `pixel_demo` Android emulator if not already running.
4. Runs the Flutter app on it (takes over the terminal — `r` hot-reloads, `q` quits).

First run is slow because the Android emulator + Flutter Gradle build need to
spin up. Subsequent runs are seconds.

## Tear it all down

```bash
./infra/dev-down.sh
```

Stops Flutter, the emulator, and the backend. MongoDB is left running (boots
fast, shared across projects). Pass `--with-mongo` to stop it too.

---

## Seed test users (one-time, or after a DB wipe)

```bash
cd backend
npm run create:superadmin -- --email=root@example.com --password=Root12345!
```

Then via the API (or use the Flutter app's register screen for Bob/Carol):

```bash
SUPER=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"root@example.com","password":"Root12345!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['tokens']['accessToken'])")

# Super admin creates community "Acme Devs" with Bob as initial admin
INVITE=$(curl -s -X POST http://localhost:3000/api/v1/super/communities \
  -H "Authorization: Bearer $SUPER" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Acme Devs","description":"Demo","category":"professional","privacy":"invite_only","initialAdminEmail":"bob@example.com"}' \
  | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d['invitation']['token'])")

# Bob accepts (inline signup creates his account)
curl -s -X POST http://localhost:3000/api/v1/invitations/$INVITE/accept \
  -H 'Content-Type: application/json' \
  -d '{"password":"BobPass123!","name":"Bob"}'
```

After this you have:

| Email | Password | Role |
|---|---|---|
| `root@example.com` | `Root12345!` | Super admin (platform-wide) |
| `bob@example.com` | `BobPass123!` | Admin of "Acme Devs" |
| `carol@example.com` | `CarolPass1!` | Member (sign up via app) |

---

## What to tap in the app to exercise every phase

### P1 — Authentication ✅
- Open the app → splash screen → routes you to **התחברות לחשבון** (login)
- Try wrong password → red Hebrew error appears (server-side validation)
- Sign in as `bob@example.com` / `BobPass123!` → lands on home (**שלום, Bob**)
- Sign out (logout icon top-left, which is now top-right under RTL)
- "אין לך חשבון? הרשמה" → register a brand-new user (uses `POST /auth/register`)

### P2 — Multi-tenant + roles ✅ (admin-only screens)
- Logged in as Bob, home shows **קהילות: 1** (his Acme Devs admin membership)
- *Backend-side*: the API will return 404 if Bob tries to read another community
  (test: `curl -H "Authorization: Bearer $BOB_TOKEN" http://localhost:3000/api/v1/communities/<other-community-id>`)

### P3 — Events ✅ (RSVP + waitlist + materials)
- Currently no mobile UI for events (P6 will add it). Test via curl:
  ```bash
  curl -X POST http://localhost:3000/api/v1/communities/<CID>/events \
    -H "Authorization: Bearer $BOB_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"title":"Intro Lecture","startAt":"2026-07-01T18:00:00Z","endAt":"2026-07-01T19:00:00Z","pricing":{"type":"free","priceCents":0,"currency":"USD"},"capacity":1,"status":"published"}'
  ```

### P4 — Payments ✅
- Tap **המנויים שלי** on home → empty list (no subs yet)
- Tap **לוח כספים** (only visible to admins) → totals + revenue-by-event
- *Backend-side*: paid-event RSVP returns 402 with `checkoutUrl` (verified by tests)

### P5 — Initiatives ✅ (full lifecycle, Hebrew RTL)
1. Tap **יוזמות** on home → empty list (or existing initiatives)
2. Tap **+ יוזמה חדשה** (FAB) → form
3. Fill `כותרת היוזמה` and `תיאור`, pick a `קטגוריה`, tap **הגש לבדיקה**
4. Sign out, sign back in as Bob (admin) — initiative is in his queue with status `הוגשה`
5. Tap the initiative → see detail screen. As admin you'd hit the approve API:
   ```bash
   curl -X POST http://localhost:3000/api/v1/initiatives/<IID>/approve \
     -H "Authorization: Bearer $BOB_TOKEN"
   ```
6. Sign back in as the original author — status now `מאושרת`, **אני בעניין** button appears
7. Tap **אני בעניין** → counter increments to 1, status flips to `פעילה`
8. Tap the inline composer → write a Hebrew comment → tap **שלח**

Notification was written in the background — verify:
```bash
AUTHOR_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<author>","password":"<pw>"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['tokens']['accessToken'])")
curl -s -H "Authorization: Bearer $AUTHOR_TOKEN" \
  http://localhost:3000/api/v1/me/notifications | python3 -m json.tool
```
You should see one entry of `type: "initiative.approved"`.

### P5 — Discussions ✅
1. Tap **שיחות** on home
2. Type something in the bottom composer, tap **שלח**
3. Pull-to-refresh — your post appears
4. *As admin*: pin via API:
   ```bash
   curl -X POST http://localhost:3000/api/v1/posts/<PID>/pin \
     -H "Authorization: Bearer $BOB_TOKEN"
   ```
5. Refresh — your post is now first with a 📌 icon (RTL-mirrored to the right edge)

### P5 — Recurring events ✅ (backend only for now)
Test via curl while the stack is up:
```bash
curl -X POST http://localhost:3000/api/v1/communities/<CID>/events \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Weekly Standup","type":"recurring","recurrenceRule":{"freq":"weekly","interval":1,"endType":"count","count":4},"startAt":"2026-07-06T16:00:00Z","endAt":"2026-07-06T16:30:00Z","pricing":{"type":"free","priceCents":0,"currency":"USD"},"status":"published"}'
```
Then check that 4 `recurring_instance` events were created:
```bash
mongosh community-demo --quiet --eval 'db.events.find({type:"recurring_instance"}).count()'
```

---

## Verifying without touching the app (pure backend smoke test)

```bash
# Health
curl http://localhost:3000/api/v1/health

# Test suite (94 backend + 18 mobile)
cd backend && npm test
cd ../mobile && flutter test
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `dev-up.sh` says "AVD 'pixel_demo' not found" | Create it: `avdmanager create avd -n pixel_demo -k 'system-images;android-34;google_apis;arm64-v8a' -d pixel` |
| Backend log shows `MONGO_URI is required` | `cp backend/.env.example backend/.env` and re-run dev-up (it'll inject JWT secrets). |
| Login from app fails with `Invalid email or password` | DB is empty after a reset. Re-run the seed steps above. |
| Login from app fails with network error | Verify `mobile/.env.development` has `API_BASE_URL=http://10.0.2.2:3000/api/v1` (Android emulator's host loopback). |
| Emulator stuck on boot | Wait — first boot of an AVD takes a couple of minutes. `tail -f infra/.run/logs/emulator.log` to follow. |
| `mongosh` reports "no primary" | Replica set didn't initiate. Run: `mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"` |
