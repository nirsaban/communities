#!/usr/bin/env bash
# Bring the full Community SaaS stack up:
#   1. MongoDB (replica set rs0, via brew services)
#   2. Backend API (TypeScript / Express on :3000)
#   3. Android emulator (AVD: pixel_demo)
#   4. Flutter app on the emulator
#
# Idempotent — safe to re-run. Skips anything already running.
# Stores PIDs in infra/.run so dev-down.sh can stop everything cleanly.

set -euo pipefail

# --- Paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_DIR="$SCRIPT_DIR/.run"
LOG_DIR="$RUN_DIR/logs"
mkdir -p "$LOG_DIR"

# --- Colors ---
if [ -t 1 ]; then
  C_INFO='\033[1;34m'; C_OK='\033[1;32m'; C_WARN='\033[1;33m'; C_ERR='\033[1;31m'; C_RST='\033[0m'
else
  C_INFO=''; C_OK=''; C_WARN=''; C_ERR=''; C_RST=''
fi
info()  { printf "${C_INFO}▸${C_RST} %s\n" "$*"; }
ok()    { printf "${C_OK}✓${C_RST} %s\n" "$*"; }
warn()  { printf "${C_WARN}!${C_RST} %s\n" "$*"; }
err()   { printf "${C_ERR}✗${C_RST} %s\n" "$*" >&2; }

# --- Environment ---
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
export PATH="/opt/homebrew/opt/openjdk@17/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:/opt/homebrew/bin:$PATH"

AVD_NAME="${AVD_NAME:-pixel_demo}"
API_PORT="${API_PORT:-3000}"
API_HEALTH_URL="http://localhost:${API_PORT}/api/v1/health"
EMULATOR_BOOT_TIMEOUT="${EMULATOR_BOOT_TIMEOUT:-180}"

# --- 1. MongoDB ---
info "Checking MongoDB..."
if pgrep -lf 'mongod --config /opt/homebrew/etc/mongod.conf' >/dev/null; then
  ok "MongoDB already running"
else
  info "Starting MongoDB (brew services)..."
  if brew services start mongodb-community@7.0 >/dev/null; then
    ok "MongoDB started"
  else
    err "Failed to start MongoDB. Run: brew services start mongodb-community@7.0"
    exit 1
  fi
fi
# Wait for port
for i in {1..30}; do
  if nc -z localhost 27017 2>/dev/null; then break; fi
  sleep 1
done
nc -z localhost 27017 2>/dev/null || { err "MongoDB not listening on :27017"; exit 1; }
ok "MongoDB ready on :27017"

# --- 2. Backend API ---
info "Checking backend API..."
if curl -fsS --max-time 2 "$API_HEALTH_URL" >/dev/null 2>&1; then
  ok "Backend already healthy at $API_HEALTH_URL"
else
  info "Starting backend (npm run dev)..."
  if [ ! -f "$REPO_DIR/backend/.env" ]; then
    warn ".env not found — copying from .env.example (you may need to fill in secrets)"
    cp "$REPO_DIR/backend/.env.example" "$REPO_DIR/backend/.env"
    # Inject fresh JWT secrets so the server boots without manual edits.
    ACCESS=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    REFRESH=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i.bak \
      -e "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$ACCESS|" \
      -e "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$REFRESH|" \
      "$REPO_DIR/backend/.env"
    rm -f "$REPO_DIR/backend/.env.bak"
  fi
  (
    cd "$REPO_DIR/backend"
    nohup npm run dev >"$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$RUN_DIR/backend.pid"
  )
  # Wait for health
  for i in {1..60}; do
    if curl -fsS --max-time 1 "$API_HEALTH_URL" >/dev/null 2>&1; then break; fi
    sleep 1
  done
  if curl -fsS --max-time 2 "$API_HEALTH_URL" >/dev/null 2>&1; then
    ok "Backend ready at $API_HEALTH_URL (log: $LOG_DIR/backend.log)"
  else
    err "Backend failed to come up. See $LOG_DIR/backend.log"
    tail -20 "$LOG_DIR/backend.log" || true
    exit 1
  fi
fi

# --- 3. Android emulator ---
info "Checking Android emulator..."
if ! command -v emulator >/dev/null 2>&1; then
  err "emulator binary not on PATH. Did you install android-commandlinetools?"
  err "  brew install --cask android-commandlinetools"
  exit 1
fi
if adb devices 2>/dev/null | awk 'NR>1 && /emulator-/ && /device$/' | grep -q .; then
  EMU_ID=$(adb devices | awk 'NR>1 && /emulator-/ && /device$/ {print $1; exit}')
  ok "Emulator already running: $EMU_ID"
else
  if ! emulator -list-avds 2>/dev/null | grep -qx "$AVD_NAME"; then
    err "AVD '$AVD_NAME' not found. Create it with:"
    err "  avdmanager create avd -n $AVD_NAME -k 'system-images;android-34;google_apis;arm64-v8a' -d pixel"
    exit 1
  fi
  info "Booting emulator $AVD_NAME (logs: $LOG_DIR/emulator.log)..."
  nohup emulator -avd "$AVD_NAME" -no-snapshot-save -no-audio -gpu auto \
    >"$LOG_DIR/emulator.log" 2>&1 &
  echo $! > "$RUN_DIR/emulator.pid"
  # Wait for adb device to appear
  for i in $(seq 1 "$EMULATOR_BOOT_TIMEOUT"); do
    EMU_ID=$(adb devices 2>/dev/null | awk 'NR>1 && /emulator-/ && /device$/ {print $1; exit}')
    [ -n "$EMU_ID" ] && break
    sleep 1
  done
  if [ -z "$EMU_ID" ]; then
    err "Emulator did not register with adb within ${EMULATOR_BOOT_TIMEOUT}s"
    exit 1
  fi
  # Wait for system boot completion
  info "Waiting for boot..."
  for i in $(seq 1 "$EMULATOR_BOOT_TIMEOUT"); do
    BOOT=$(adb -s "$EMU_ID" shell 'getprop sys.boot_completed' 2>/dev/null | tr -d '\r')
    [ "$BOOT" = "1" ] && break
    sleep 2
  done
  ok "Emulator booted: $EMU_ID"
fi

# --- 4. Flutter on the emulator ---
info "Launching Flutter app on $EMU_ID..."
ok "Stack is up."
printf "\n"
printf "  ${C_INFO}Backend logs:${C_RST}   tail -f %s\n" "$LOG_DIR/backend.log"
printf "  ${C_INFO}Emulator logs:${C_RST}  tail -f %s\n" "$LOG_DIR/emulator.log"
printf "  ${C_INFO}Tear down:${C_RST}      %s/dev-down.sh\n" "$SCRIPT_DIR"
printf "\n"
printf "  ${C_OK}Test users (already in DB if you used dev-up before):${C_RST}\n"
printf "    root@example.com  / Root12345!   (super admin)\n"
printf "    bob@example.com   / BobPass123!  (admin of Acme Devs)\n"
printf "    carol@example.com / CarolPass1!  (member)\n"
printf "\n"
printf "  ${C_WARN}If logins fail (fresh DB), seed them:${C_RST}\n"
printf "    cd backend && npm run create:superadmin -- --email=root@example.com --password=Root12345!\n"
printf "\n"
info "flutter run is taking over this terminal. Press 'r' to hot-reload, 'q' to quit Flutter."
printf "\n"

cd "$REPO_DIR/mobile"
exec flutter run -d "$EMU_ID" --dart-define=FLAVOR=development
