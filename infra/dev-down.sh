#!/usr/bin/env bash
# Bring the full Community SaaS dev stack down.
#
# By default: stops Flutter (any running `flutter run`), the emulator, and the
# backend API started by dev-up.sh. MongoDB is left running (boots fast and is
# shared across projects). Pass --with-mongo to stop it too.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$SCRIPT_DIR/.run"
LOG_DIR="$RUN_DIR/logs"

STOP_MONGO=0
for arg in "$@"; do
  case "$arg" in
    --with-mongo) STOP_MONGO=1 ;;
    -h|--help)
      cat <<EOF
Usage: $(basename "$0") [--with-mongo]

  --with-mongo    Also stop MongoDB (brew services). By default it's left up.
EOF
      exit 0
      ;;
  esac
done

# --- Colors ---
if [ -t 1 ]; then
  C_INFO='\033[1;34m'; C_OK='\033[1;32m'; C_WARN='\033[1;33m'; C_RST='\033[0m'
else
  C_INFO=''; C_OK=''; C_WARN=''; C_RST=''
fi
info() { printf "${C_INFO}▸${C_RST} %s\n" "$*"; }
ok()   { printf "${C_OK}✓${C_RST} %s\n" "$*"; }
warn() { printf "${C_WARN}!${C_RST} %s\n" "$*"; }

export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:/opt/homebrew/bin:$PATH"

kill_pidfile() {
  local f="$1" name="$2"
  [ -f "$f" ] || return 0
  local pid
  pid=$(cat "$f" 2>/dev/null)
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    info "Stopping $name (pid $pid)..."
    kill "$pid" 2>/dev/null || true
    # Give it a grace period, then force.
    for i in 1 2 3 4 5; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    ok "$name stopped"
  fi
  rm -f "$f"
}

# --- 1. Flutter (any local `flutter run`) ---
info "Stopping any Flutter dev sessions..."
if pgrep -lf "flutter_tools.snapshot run" >/dev/null 2>&1; then
  pkill -f "flutter_tools.snapshot run" >/dev/null 2>&1 || true
  ok "Flutter dev session(s) terminated"
else
  ok "No Flutter session running"
fi

# --- 2. Android emulator ---
info "Stopping emulator(s)..."
if command -v adb >/dev/null 2>&1; then
  EMUS=$(adb devices 2>/dev/null | awk 'NR>1 && /emulator-/ && /device$/ {print $1}')
  if [ -n "$EMUS" ]; then
    for id in $EMUS; do
      adb -s "$id" emu kill >/dev/null 2>&1 || true
      ok "Killed $id"
    done
  else
    ok "No emulator running"
  fi
fi
kill_pidfile "$RUN_DIR/emulator.pid" "emulator (pidfile)"

# --- 3. Backend ---
info "Stopping backend API..."
kill_pidfile "$RUN_DIR/backend.pid" "backend"
# Belt + suspenders: any stray tsx watch process.
if pgrep -lf "tsx watch src/server.ts" >/dev/null 2>&1; then
  pkill -f "tsx watch src/server.ts" >/dev/null 2>&1 || true
  ok "Killed stray tsx watch process"
fi

# --- 4. MongoDB (optional) ---
if [ "$STOP_MONGO" -eq 1 ]; then
  info "Stopping MongoDB..."
  if command -v brew >/dev/null 2>&1; then
    brew services stop mongodb-community@7.0 >/dev/null 2>&1 \
      && ok "MongoDB stopped" \
      || warn "Couldn't stop MongoDB via brew (already stopped?)"
  else
    warn "brew not on PATH; skipping MongoDB"
  fi
else
  info "Leaving MongoDB running (pass --with-mongo to also stop it)"
fi

printf "\n"
ok "Dev stack is down."
[ -d "$LOG_DIR" ] && printf "  Logs from this session: %s\n" "$LOG_DIR"
