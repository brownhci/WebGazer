#!/usr/bin/env bash
# Replit Git SSH — clés stockées dans le projet (persistent), pas dans ~/.ssh
#
# Usage:
#   1. bash setup-ssh.sh          → génère .ssh/id_ed25519 dans le projet
#   2. Ajoutez la clé publique sur GitLab
#   3. git fetch origin
#
# Les clés vivent dans <projet>/.ssh/ (gitignored).
# Git est configuré via core.sshCommand dans .git/config (persistant).
#
# Optionnel : si .ssh/ est vide, restaure depuis Secrets (SSH_PRIVATE_KEY_B64 + SSH_PUBLIC_KEY)
# Optional env: GITLAB_HOST (default: gitlab.cantoo.fr)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel 2>/dev/null || echo "${SCRIPT_DIR}")"
SSH_DIR="${PROJECT_DIR}/.ssh"
PRIVATE_KEY="${SSH_DIR}/id_ed25519"
PUBLIC_KEY="${SSH_DIR}/id_ed25519.pub"
GITIGNORE="${PROJECT_DIR}/.gitignore"
GITLAB_HOST="${GITLAB_HOST:-gitlab.cantoo.fr}"
GITIGNORE_MARKER="# Replit SSH keys (setup-ssh.sh)"

normalize_private_key() {
  local key="$1"
  key="${key//\\n/$'\n'}"
  if [[ "$key" != *$'\n'* ]] && [[ "$key" == *" "* ]]; then
    key="${key// /$'\n'}"
  fi
  printf '%s\n' "$key"
}

verify_private_key() {
  if ! ssh-keygen -y -f "${PRIVATE_KEY}" >/dev/null 2>&1; then
    echo "✗ Clé privée invalide : ${PRIVATE_KEY}" >&2
    return 1
  fi
}

ensure_gitignore() {
  touch "${GITIGNORE}"
  if grep -qF "${GITIGNORE_MARKER}" "${GITIGNORE}" 2>/dev/null; then
    return
  fi
  cat >> "${GITIGNORE}" <<EOF

${GITIGNORE_MARKER}
.ssh/
EOF
  echo "→ .gitignore mis à jour (.ssh/ ignoré)"
}

write_ssh_config() {
  mkdir -p "${SSH_DIR}"
  chmod 700 "${SSH_DIR}"
  cat > "${SSH_DIR}/config" <<EOF
Host ${GITLAB_HOST}
  User git
  IdentityFile ${PRIVATE_KEY}
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF
  chmod 600 "${SSH_DIR}/config"
  chmod 600 "${PRIVATE_KEY}" 2>/dev/null || true
  chmod 644 "${PUBLIC_KEY}" 2>/dev/null || true
}

configure_git() {
  if ! git -C "${PROJECT_DIR}" rev-parse --git-dir >/dev/null 2>&1; then
    echo "⚠ Pas de dépôt git dans ${PROJECT_DIR} — core.sshCommand non configuré"
    return
  fi
  git -C "${PROJECT_DIR}" config core.sshCommand \
    "ssh -i ${PRIVATE_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
  echo "→ git config core.sshCommand → ${PRIVATE_KEY}"
}

restore_from_secrets() {
  mkdir -p "${SSH_DIR}"
  chmod 700 "${SSH_DIR}"

  if [[ -n "${SSH_PRIVATE_KEY_B64:-}" ]]; then
    printf '%s' "$SSH_PRIVATE_KEY_B64" | base64 -d > "${PRIVATE_KEY}"
  elif [[ -n "${SSH_PRIVATE_KEY:-}" ]]; then
    normalize_private_key "$SSH_PRIVATE_KEY" > "${PRIVATE_KEY}"
  else
    return 1
  fi

  if [[ -z "${SSH_PUBLIC_KEY:-}" ]]; then
    echo "✗ Secret SSH_PUBLIC_KEY manquant" >&2
    return 1
  fi

  printf '%s\n' "$SSH_PUBLIC_KEY" > "${PUBLIC_KEY}"
  chmod 600 "${PRIVATE_KEY}"
  chmod 644 "${PUBLIC_KEY}"
  verify_private_key
}

finish_setup() {
  ensure_gitignore
  write_ssh_config
  configure_git
  echo "✓ SSH configuré (${GITLAB_HOST})"
  echo "  Clés : ${SSH_DIR}/"
  echo "  Test : ssh -F ${SSH_DIR}/config -T git@${GITLAB_HOST}"
  echo "         git -C ${PROJECT_DIR} fetch origin"
}

# Clés déjà dans le projet → reconfigurer git et sortir
if [[ -f "${PRIVATE_KEY}" ]]; then
  echo "→ Clés trouvées dans le projet (${PRIVATE_KEY})"
  verify_private_key
  finish_setup
  exit 0
fi

# Pas de clés : tenter restauration depuis Secrets (migration ponctuelle)
if [[ -n "${SSH_PUBLIC_KEY:-}" && ( -n "${SSH_PRIVATE_KEY:-}" || -n "${SSH_PRIVATE_KEY_B64:-}" ) ]]; then
  echo "→ Restauration depuis Secrets vers ${SSH_DIR}/..."
  restore_from_secrets
  finish_setup
  echo ""
  echo "  Les clés sont maintenant dans le projet. Vous pouvez supprimer"
  echo "  les Secrets SSH_* — elles ne sont plus nécessaires."
  exit 0
fi

# Première installation : générer une nouvelle paire
echo "→ Génération d'une nouvelle paire ed25519 dans ${SSH_DIR}/..."
mkdir -p "${SSH_DIR}"
chmod 700 "${SSH_DIR}"
ssh-keygen -t ed25519 -C "replit-${GITLAB_HOST}" -f "${PRIVATE_KEY}" -N ""

finish_setup

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Ajoutez cette clé PUBLIQUE sur GitLab (${GITLAB_HOST})"
echo "════════════════════════════════════════════════════════════════"
cat "${PUBLIC_KEY}"
echo ""
echo "  Preferences → SSH Keys  ou  Deploy key sur le projet"
echo ""
echo "  Les clés privées restent dans .ssh/ (gitignored, persistent sur Replit)."
echo "  Plus besoin de onBoot ni de Secrets pour le SSH."
echo ""
