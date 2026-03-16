#!/bin/bash
# ClaudePulse Uninstaller
# Removes the reporter script and unregisters hooks from Claude Code settings.

set -e

CLAUDE_DIR="$HOME/.claude"
HOOKS_DIR="$CLAUDE_DIR/hooks"
SETTINGS="$CLAUDE_DIR/settings.json"
REPORTER="claude-pulse-reporter.js"

echo "=== ClaudePulse Uninstaller ==="

# Remove reporter script
if [ -f "$HOOKS_DIR/$REPORTER" ]; then
  rm "$HOOKS_DIR/$REPORTER"
  echo "[OK] Reporter removed: $HOOKS_DIR/$REPORTER"
else
  echo "[SKIP] Reporter not found"
fi

# Unregister hooks
if [ -f "$SETTINGS" ]; then
  cp "$SETTINGS" "${SETTINGS}.bak"

  node -e "
const fs = require('fs');
const settingsPath = '$SETTINGS';
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

if (settings.hooks) {
  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter(m =>
      !m.hooks || !m.hooks.some(h => h.command && h.command.includes('claude-pulse-reporter'))
    );
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
"

  echo "[OK] Hooks removed from $SETTINGS"
else
  echo "[SKIP] Settings not found"
fi

# Clean up socket
SOCKET="/tmp/claude-pulse.sock"
if [ -S "$SOCKET" ]; then
  rm "$SOCKET"
  echo "[OK] Socket removed: $SOCKET"
fi

echo ""
echo "=== Uninstallation complete ==="
