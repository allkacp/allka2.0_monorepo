#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/allka-2026}"
DEPLOY_USER="${SUDO_USER:-$USER}"

if ! command -v lsb_release >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y lsb-release
fi

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg ufw

sudo install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
fi

codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
arch="$(dpkg --print-architecture)"
echo "deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${codename} stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

sudo mkdir -p "${DEPLOY_PATH}/infra/caddy"
sudo chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_PATH}"

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

if ! id -nG "${DEPLOY_USER}" | grep -qw docker; then
  sudo usermod -aG docker "${DEPLOY_USER}"
fi

echo "VPS ready. Deploy path: ${DEPLOY_PATH}"
echo "If ${DEPLOY_USER} was just added to the docker group, reconnect SSH before the first deploy."