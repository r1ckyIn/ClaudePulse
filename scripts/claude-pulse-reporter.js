#!/usr/bin/env node
// ClaudePulse Hook Reporter
//
// Installed to ~/.claude/hooks/ by ClaudePulse.
// Receives hook events from Claude Code via stdin JSON,
// extracts the unique session_id from the payload, and
// forwards enriched data to ClaudePulse via Unix socket or HTTP.
//
// KEY FIX over ClaudeGlance: session_id is read from the hook
// JSON payload (guaranteed unique per Claude Code instance),
// NOT from environment variables or TTY hashing.

const net = require('net');
const http = require('http');
const path = require('path');
const os = require('os');

const SOCKET_PATH = path.join(os.tmpdir(), 'claude-pulse.sock');
const HTTP_PORT_START = 19860;
const HTTP_PORT_END = 19870;

// Timeout guard: exit silently if stdin doesn't close within 3s
// (prevents hanging on pipe issues). Same pattern as gsd-context-monitor.js.
const stdinTimeout = setTimeout(() => process.exit(0), 3000);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const hookData = JSON.parse(input);

    // Extract session_id from hook payload (the core fix)
    const sessionId = hookData.session_id;
    if (!sessionId) {
      process.exit(0);
    }

    // Determine hook event from first CLI arg or infer from hook data
    const hookEventName = process.argv[2] || hookData.type || 'Unknown';

    // Determine terminal
    const terminal = process.env.TERM_PROGRAM
      || process.env.TERMINAL_EMULATOR
      || (process.env.ITERM_SESSION_ID ? 'iTerm2' : 'Terminal');

    // Use cwd from hook data (more reliable than process.cwd)
    const cwd = hookData.cwd || process.cwd();
    const project = path.basename(cwd);

    const payload = JSON.stringify({
      session_id: sessionId,
      cwd: cwd,
      project: project,
      terminal: terminal,
      timestamp: Date.now(),
      hook_event_name: hookEventName,
      tool_name: hookData.tool_name || null,
      tool_input: hookData.tool_input || null,
      transcript_path: hookData.transcript_path || null,
    });

    // Try Unix socket first, fall back to HTTP
    sendViaSocket(payload, () => {
      sendViaHttp(payload, () => {
        // Both failed — exit silently, never block Claude Code
        process.exit(0);
      });
    });
  } catch {
    // Malformed input — exit silently
    process.exit(0);
  }
});

function sendViaSocket(payload, onFail) {
  const client = net.createConnection(SOCKET_PATH, () => {
    client.write(payload);
    client.end();
    process.exit(0);
  });

  client.on('error', () => {
    onFail();
  });

  // Timeout for socket connection
  client.setTimeout(2000, () => {
    client.destroy();
    onFail();
  });
}

function sendViaHttp(payload, onFail, port) {
  const p = port || HTTP_PORT_START;
  if (p > HTTP_PORT_END) {
    onFail();
    return;
  }

  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: p,
      path: '/api/status',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 2000,
    },
    () => {
      process.exit(0);
    }
  );

  req.on('error', () => {
    sendViaHttp(payload, onFail, p + 1);
  });

  req.on('timeout', () => {
    req.destroy();
    sendViaHttp(payload, onFail, p + 1);
  });

  req.write(payload);
  req.end();
}
