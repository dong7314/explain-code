#!/usr/bin/env bash
set -euo pipefail

REPO="${EXPLAIN_CODE_REPO:-dong7314/explain-code}"
REF="${EXPLAIN_CODE_REF:-master}"
INSTALL_ROOT="${EXPLAIN_CODE_HOME:-$HOME/.explain-code}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

log() {
  printf '[explain-code] %s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

copy_clean_dir() {
  local source="$1"
  local destination="$2"

  if [ ! -d "$source" ]; then
    printf 'Missing source directory: %s\n' "$source" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$destination")"
  rm -rf "$destination"
  cp -R "$source" "$destination"
}

require_command curl
require_command tar

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

ARCHIVE="$TMP_DIR/source.tar.gz"
log "Downloading $REPO@$REF"
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$REF" -o "$ARCHIVE"

log "Extracting archive"
tar -xzf "$ARCHIVE" -C "$TMP_DIR"
SOURCE_ROOT="$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"

if [ -z "$SOURCE_ROOT" ]; then
  printf 'Cannot find extracted source directory.\n' >&2
  exit 1
fi

mkdir -p "$INSTALL_ROOT"

log "Installing shared publisher tool"
copy_clean_dir "$SOURCE_ROOT/tools/explain-code-ingest" "$INSTALL_ROOT/tools/explain-code-ingest"

log "Installing Codex skill"
mkdir -p "$CODEX_HOME/skills"
copy_clean_dir "$SOURCE_ROOT/integrations/codex-skill/explain-code-learning" "$CODEX_HOME/skills/explain-code-learning"

log "Installing Claude Code plugin files"
copy_clean_dir "$SOURCE_ROOT/integrations/claude-code-plugin" "$INSTALL_ROOT/integrations/claude-code-plugin"

LAUNCHER="$INSTALL_ROOT/claude-explain-code"
cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
exec claude --plugin-dir "$INSTALL_ROOT/integrations/claude-code-plugin" "\$@"
EOF
chmod +x "$LAUNCHER"

printf '\n'
log "Install complete."
printf '\n'
printf 'Codex:\n'
printf '  1. Restart Codex.\n'
printf '  2. Ask Codex to use the explain-code-learning skill.\n\n'
printf 'Claude Code:\n'
printf '  Start Claude Code with the plugin:\n'
printf '    %s\n' "$LAUNCHER"
printf '  Then run:\n'
printf '    /explain-code:publish-learning\n\n'
printf 'Environment before publishing:\n'
printf '  grep -qxF '\''export EXPLAIN_CODE_API_TOKEN="expc_live_..."'\'' ~/.zshrc || echo '\''export EXPLAIN_CODE_API_TOKEN="expc_live_..."'\'' >> ~/.zshrc; source ~/.zshrc\n'
printf 'Optional:\n'
printf '  grep -qxF '\''export EXPLAIN_CODE_API_URL="https://explain.ldy-studio.com/api"'\'' ~/.zshrc || echo '\''export EXPLAIN_CODE_API_URL="https://explain.ldy-studio.com/api"'\'' >> ~/.zshrc; source ~/.zshrc\n'
printf 'Group selection:\n'
printf '  Codex and Claude Code will list existing groups and choose or create the group automatically.\n\n'

if ! command -v node >/dev/null 2>&1; then
  printf 'Warning: Node.js was not found in PATH. Install Node.js before publishing learning episodes.\n' >&2
fi
