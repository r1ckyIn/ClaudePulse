#!/bin/bash
# ClaudePulse Installer
# Copies the reporter script and registers hooks in Claude Code settings.

set -e

CLAUDE_DIR="$HOME/.claude"
HOOKS_DIR="$CLAUDE_DIR/hooks"
SETTINGS="$CLAUDE_DIR/settings.json"
REPORTER="claude-pulse-reporter.js"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== ClaudePulse Installer ==="

# Ensure directories exist
mkdir -p "$HOOKS_DIR"

# Copy reporter script
if [ -f "$SCRIPT_DIR/$REPORTER" ]; then
  cp "$SCRIPT_DIR/$REPORTER" "$HOOKS_DIR/$REPORTER"
  chmod +x "$HOOKS_DIR/$REPORTER"
  echo "[OK] Reporter installed: $HOOKS_DIR/$REPORTER"
else
  echo "[ERROR] Reporter script not found: $SCRIPT_DIR/$REPORTER"
  exit 1
fi

# Back up settings
if [ -f "$SETTINGS" ]; then
  cp "$SETTINGS" "${SETTINGS}.bak"
  echo "[OK] Settings backed up: ${SETTINGS}.bak"
fi

# Register hooks using Node.js for reliable JSON manipulation
node -e "
const fs = require('fs');
const path = require('path');

const settingsPath = '$SETTINGS';
const reporterPath = path.join('$HOOKS_DIR', '$REPORTER');

let settings = {};
if (fs.existsSync(settingsPath)) {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}

if (!settings.hooks) settings.hooks = {};

const events = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop'];

for (const event of events) {
  if (!settings.hooks[event]) settings.hooks[event] = [];

  const command = 'node \"' + reporterPath + '\" ' + event;
  const exists = settings.hooks[event].some(m =>
    m.hooks && m.hooks.some(h => h.command && h.command.includes('claude-pulse-reporter'))
  );

  if (!exists) {
    settings.hooks[event].push({
      matcher: '*',
      hooks: [{ type: 'command', command }]
    });
  }
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
"

echo "[OK] Hooks registered in $SETTINGS"
echo ""
echo "=== Installation complete ==="
echo "ClaudePulse hooks are now active for all Claude Code sessions."
