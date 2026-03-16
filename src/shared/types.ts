// Hook event types from Claude Code
export type HookEventName =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'Stop'
  | 'SessionStart'
  | 'SessionEnd'

// Session status derived from hook events
export type SessionStatus =
  | 'idle'
  | 'reading'
  | 'writing'
  | 'thinking'
  | 'waiting'
  | 'completed'
  | 'error'

// Message received from the hook reporter
export interface HookMessage {
  session_id: string
  cwd: string
  project: string
  terminal: string
  timestamp: number
  hook_event_name: HookEventName
  tool_name?: string
  tool_input?: Record<string, unknown>
  transcript_path?: string
}

// Tracked session state in the manager
export interface SessionState {
  sessionId: string
  project: string
  cwd: string
  terminal: string
  status: SessionStatus
  currentTool: string | null
  startedAt: number
  lastActivityAt: number
  toolHistory: string[]
}

// IPC channels between main and renderer
export const IPC_CHANNELS = {
  SESSIONS_UPDATED: 'sessions:updated',
  SESSION_REMOVED: 'session:removed',
  GET_SESSIONS: 'sessions:get',
  GET_STATS: 'stats:get',
  STATS_UPDATED: 'stats:updated',
  TOGGLE_WINDOW: 'window:toggle',
  UPDATE_SETTINGS: 'settings:update',
} as const

// Statistics for a single day
export interface DayStats {
  date: string // YYYY-MM-DD
  sessionCount: number
  toolCalls: number
  toolBreakdown: Record<string, number>
  totalDurationMs: number
}
