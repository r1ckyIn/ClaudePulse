import { join } from 'path'
import { tmpdir } from 'os'

// IPC transport configuration
export const SOCKET_PATH = join(tmpdir(), 'claude-pulse.sock')
export const HTTP_PORT_START = 19860
export const HTTP_PORT_END = 19870

// Session timeouts (ms)
export const TIMEOUT_COMPLETED = 5_000
export const TIMEOUT_IDLE = 90_000
export const TIMEOUT_ACTIVE = 60_000
export const CLEANUP_INTERVAL = 5_000

// Reporter script name
export const REPORTER_SCRIPT = 'claude-pulse-reporter.js'
export const REPORTER_HOOK_COMMAND_PREFIX = 'node'

// Tool name to status mapping
export const TOOL_STATUS_MAP: Record<string, 'reading' | 'writing' | 'thinking'> = {
  Read: 'reading',
  Glob: 'reading',
  Grep: 'reading',
  LS: 'reading',
  Edit: 'writing',
  Write: 'writing',
  MultiEdit: 'writing',
  NotebookEdit: 'writing',
  Bash: 'thinking',
  Agent: 'thinking',
  WebSearch: 'reading',
  WebFetch: 'reading',
}

// Max tool history entries per session
export const MAX_TOOL_HISTORY = 10
