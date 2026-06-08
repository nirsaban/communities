#!/usr/bin/env bash
# Deploy the communities API to a single-VPS production host.
#
# Usage:   ./infra/deploy.sh root@72.62.154.127
#          ./infra/deploy.sh root@72.62.154.127 --first-time
#
# What it does:
#   • Ensures Docker + Docker Compose are installed on the host
#   • rsyncs the repo to /opt/communities/ (excluding node_modules, build, .git, etc.)
#   • Copies infra/.env.prod.example → .env.prod ONLY if missing (so secrets are not overwritten)
#   • Runs: docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
#   • Tails health check
#
# Prereqs:
#   • SSH key auth to root@<host> works (no password prompt)
#   • The repo's working tree is clean enough to ship (uncommitted changes are sent as-is)

set -euo pipefail

HOST="${1:-}"
FIRST_TIME=0
if [[ "${2:-}" == "--first-time" ]]; then FIRST_TIME=1; fi

if [[ -z "$HOST" ]]; then
  echo "usage: $0 root@host [--first-time]" >&2
  exit 1
fi

REMOTE_DIR=/opt/communities
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Probing SSH access to $HOST ..."
ssh -o BatchMode=yes -o ConnectTimeout=8 "$HOST" 'echo connected' \
  || { echo "✖ SSH key auth failed. Run: cat ~/.ssh/id_ed25519.pub | ssh $HOST 'cat >> ~/.ssh/authorized_keys'"; exit 1; }

if [[ "$FIRST_TIME" -eq 1 ]]; then
  echo "→ First-time host setup (installing Docker if needed) ..."
  ssh "$HOST" bash <<'REMOTE'
set -euo pipefail
if ! command -v rsync >/dev/null 2>&1; then
  echo "  installing rsync ..."
  apt-get update -qq && apt-get install -y -qq rsync
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "  installing docker via convenience script ..."
  curl -fsSL https://get.docker.com | sh
fi
docker --version
docker compose version
mkdir -p /opt/communities
REMOTE
fi

echo "→ rsyncing repo → $HOST:$REMOTE_DIR ..."
rsync -az --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='backend/dist/' \
  --exclude='backend/uploads/' \
  --exclude='backend/coverage/' \
  --exclude='web/dist/' \
  --exclude='web/.vite/' \
  --exclude='mobile/build/' \
  --exclude='mobile/.dart_tool/' \
  --exclude='mobile/.fvm/' \
  --exclude='.env' \
  --exclude='.env.prod' \
  --exclude='.claude/' \
  "$LOCAL_DIR/" "$HOST:$REMOTE_DIR/"

echo "→ Ensuring .env.prod exists + has every key from the example ..."
ssh "$HOST" bash <<REMOTE
set -euo pipefail
cd $REMOTE_DIR
if [ ! -f .env.prod ]; then
  cp infra/.env.prod.example .env.prod
  chmod 600 .env.prod
  # First-run: swap placeholder JWT secrets for real ones generated on the host.
  JWT_A=\$(openssl rand -hex 32)
  JWT_R=\$(openssl rand -hex 32)
  sed -i "s|REPLACE_WITH_RANDOM_32_BYTE_HEX|\$JWT_A|" .env.prod
  sed -i "s|REPLACE_WITH_DIFFERENT_RANDOM_32_BYTE_HEX|\$JWT_R|" .env.prod
  echo "  generated fresh JWT secrets into .env.prod"
fi

# Merge: append any KEY from .env.prod.example that's missing from .env.prod.
# Preserves existing values (no overwrite). Catches the case where deploy.sh
# adds a new required env var (WEB_BASE_URL, future Stripe/PayPlus/Cloudinary
# keys, etc.) and an old .env.prod is missing it.
added=()
while IFS= read -r line; do
  case "\$line" in
    ''|\#*) continue ;;
  esac
  key="\${line%%=*}"
  if ! grep -qE "^[[:space:]]*\${key}=" .env.prod; then
    echo "\$line" >> .env.prod
    added+=("\$key")
  fi
done < infra/.env.prod.example

if [ \${#added[@]} -gt 0 ]; then
  echo "  added missing keys from example: \${added[*]}"
  echo "  → review their values in .env.prod before next deploy if defaults need changes"
fi
REMOTE

echo "→ Building + restarting containers ..."
ssh "$HOST" "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"

echo "→ Health check ..."
sleep 8
echo "  api (direct):"
ssh "$HOST" "curl -sS http://localhost:3010/api/v1/health | head -c 300; echo"
echo "  web (nginx healthz):"
ssh "$HOST" "curl -sS -o /dev/null -w '    HTTP %{http_code}\n' http://localhost:3011/healthz"
echo "  web → api proxy:"
ssh "$HOST" "curl -sS -o /dev/null -w '    HTTP %{http_code}\n' http://localhost:3011/api/v1/health"

H=${HOST#*@}
echo
echo "✓ deploy complete."
echo "  API:  http://$H:3010/api/v1/health"
echo "  Web:  http://$H:3011/   (also serves /api/v1/* via internal proxy)"
