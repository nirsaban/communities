#!/usr/bin/env bash
# Install a self-hosted GitHub Actions runner on this VPS.
#
# Run this ON THE VPS (not your laptop):
#   ssh root@<HOST>
#   cd /opt/communities
#   bash infra/install-github-runner.sh
#
# Why a self-hosted runner: the VPS firewall blocks inbound SSH from GitHub's
# runner IP ranges. A self-hosted runner runs ON the VPS and reaches GitHub
# via OUTBOUND HTTPS, so no firewall changes are needed. After install, every
# push to main fires the deploy locally (no SSH).
#
# You'll need a one-time registration token from:
#   https://github.com/<owner>/<repo>/settings/actions/runners/new
# Click "Linux" — copy the token shown after `--token` in the example command.

set -euo pipefail

OWNER_REPO="${OWNER_REPO:-nirsaban/communities}"
RUNNER_DIR="/opt/actions-runner"
RUNNER_VERSION="2.319.1"
RUNNER_USER="actions-runner"

echo "→ Self-hosted GitHub Actions runner installer"
echo "  Repo: $OWNER_REPO"
echo "  Install dir: $RUNNER_DIR"
echo

# Create a non-root user for the runner.
if ! id -u "$RUNNER_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$RUNNER_USER"
  usermod -aG docker "$RUNNER_USER" 2>/dev/null || true
  echo "  created user $RUNNER_USER"
fi

if ! groups "$RUNNER_USER" | grep -q docker; then
  usermod -aG docker "$RUNNER_USER"
fi

mkdir -p "$RUNNER_DIR"
chown -R "$RUNNER_USER:$RUNNER_USER" "$RUNNER_DIR"

# Download the runner.
if [ ! -f "$RUNNER_DIR/config.sh" ]; then
  echo "→ Downloading runner v$RUNNER_VERSION ..."
  ARCH=$(dpkg --print-architecture 2>/dev/null || uname -m)
  case "$ARCH" in
    amd64|x86_64) RUNNER_ARCH="x64" ;;
    arm64|aarch64) RUNNER_ARCH="arm64" ;;
    *) echo "✖ Unsupported arch: $ARCH" >&2; exit 1 ;;
  esac
  TARBALL="actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"
  sudo -u "$RUNNER_USER" -- bash -c "
    cd $RUNNER_DIR
    curl -fsSL https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/$TARBALL -o $TARBALL
    tar xzf $TARBALL
    rm $TARBALL
  "
else
  echo "→ Runner files already present; skipping download."
fi

# Register with GitHub.
if [ -z "${RUNNER_TOKEN:-}" ]; then
  echo
  echo "→ Open this page in your browser to get a registration token:"
  echo "    https://github.com/$OWNER_REPO/settings/actions/runners/new"
  echo "  Click 'Linux' → copy the token after '--token' in the displayed command."
  echo
  read -r -p "Paste registration token: " RUNNER_TOKEN
fi

if [ -f "$RUNNER_DIR/.runner" ]; then
  echo "→ Runner already configured (.runner found). Skipping config."
else
  echo "→ Registering runner with GitHub ..."
  sudo -u "$RUNNER_USER" -- bash -c "
    cd $RUNNER_DIR
    ./config.sh \
      --url https://github.com/$OWNER_REPO \
      --token $RUNNER_TOKEN \
      --name '$(hostname)' \
      --labels self-hosted,linux,communities \
      --work _work \
      --unattended \
      --replace
  "
fi

# Install as systemd service.
SVC_NAME="actions.runner.${OWNER_REPO/\//-}.$(hostname).service"
if [ ! -f "/etc/systemd/system/$SVC_NAME" ]; then
  echo "→ Installing as systemd service ..."
  cd "$RUNNER_DIR"
  ./svc.sh install "$RUNNER_USER"
  ./svc.sh start
  ./svc.sh status | head -20
else
  echo "→ systemd service already installed."
fi

# Make sure the runner user can read the deploy code.
chown -R "$RUNNER_USER:$RUNNER_USER" /opt/communities 2>/dev/null || true

echo
echo "✓ Runner installed and running."
echo "  Status: cd $RUNNER_DIR && ./svc.sh status"
echo "  Logs:   journalctl -u $SVC_NAME -f"
echo
echo "Next: push any commit to main → the deploy workflow runs locally on this host."
