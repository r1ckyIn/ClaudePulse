import { EventEmitter } from 'events'
import type { HookMessage, SessionState, SessionStatus, DayStats } from '../shared/types'
import { TOOL_STATUS_MAP, MAX_TOOL_HISTORY, TIMEOUT_COMPLETED, TIMEOUT_IDLE, TIMEOUT_ACTIVE, CLEANUP_INTERVAL } from '../shared/constants'

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, SessionState>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  start(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL)
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.sessions.clear()
  }

  handleMessage(message: HookMessage): void {
    const now = Date.now()
    const status = this.deriveStatus(message)
    const existing = this.sessions.get(message.session_id)

    if (existing) {
      existing.status = status
      existing.lastActivityAt = now
      existing.currentTool = message.tool_name ?? null

      // Update project/cwd if changed (e.g. cd in same session)
      if (message.cwd) existing.cwd = message.cwd
      if (message.project) existing.project = message.project

      if (message.tool_name) {
        existing.toolHistory.push(message.tool_name)
        if (existing.toolHistory.length > MAX_TOOL_HISTORY) {
          existing.toolHistory.shift()
        }
      }
    } else {
      const session: SessionState = {
        sessionId: message.session_id,
        project: message.project || this.extractProject(message.cwd),
        cwd: message.cwd || '',
        terminal: message.terminal || 'Terminal',
        status,
        currentTool: message.tool_name ?? null,
        startedAt: now,
        lastActivityAt: now,
        toolHistory: message.tool_name ? [message.tool_name] : [],
      }
      this.sessions.set(message.session_id, session)
    }

    this.emit('updated', this.getAll())
  }

  getAll(): SessionState[] {
    return Array.from(this.sessions.values())
  }

  getById(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId)
  }

  getCount(): number {
    return this.sessions.size
  }

  private deriveStatus(message: HookMessage): SessionStatus {
    switch (message.hook_event_name) {
      case 'PreToolUse':
        return message.tool_name
          ? (TOOL_STATUS_MAP[message.tool_name] ?? 'thinking')
          : 'thinking'
      case 'PostToolUse':
        return 'thinking'
      case 'Notification':
        return 'waiting'
      case 'Stop':
        return 'completed'
      case 'SessionEnd':
        return 'completed'
      case 'SessionStart':
        return 'idle'
      default:
        return 'idle'
    }
  }

  private extractProject(cwd: string): string {
    if (!cwd) return 'Unknown'
    const parts = cwd.split('/')
    return parts[parts.length - 1] || 'Unknown'
  }

  private cleanup(): void {
    const now = Date.now()
    const removed: string[] = []

    for (const [id, session] of this.sessions) {
      const elapsed = now - session.lastActivityAt

      const shouldRemove =
        (session.status === 'completed' && elapsed > TIMEOUT_COMPLETED) ||
        (session.status === 'error' && elapsed > TIMEOUT_COMPLETED) ||
        (session.status === 'idle' && elapsed > TIMEOUT_IDLE) ||
        (session.status === 'waiting' && elapsed > TIMEOUT_IDLE) ||
        (['reading', 'writing', 'thinking'].includes(session.status) && elapsed > TIMEOUT_ACTIVE)

      if (shouldRemove) {
        this.sessions.delete(id)
        removed.push(id)
      }
    }

    if (removed.length > 0) {
      for (const id of removed) {
        this.emit('removed', id)
      }
      this.emit('updated', this.getAll())
    }
  }
}
