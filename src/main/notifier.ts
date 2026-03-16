import { Notification } from 'electron'
import type { SessionState } from '../shared/types'

/**
 * Sends macOS system notifications when Claude Code needs user input.
 * Tracks which sessions have already been notified to avoid duplicates.
 */
export class Notifier {
  private notifiedSessions = new Set<string>()

  notifyIfWaiting(session: SessionState): void {
    if (session.status !== 'waiting') {
      // Clear notification state when session is no longer waiting
      this.notifiedSessions.delete(session.sessionId)
      return
    }

    if (this.notifiedSessions.has(session.sessionId)) {
      return
    }

    this.notifiedSessions.add(session.sessionId)

    const shortId = session.sessionId.slice(0, 4)
    const notification = new Notification({
      title: 'Claude Code needs input',
      body: `${session.project} #${shortId} is waiting for your response`,
      silent: false,
    })

    notification.show()
  }

  notifyCompleted(session: SessionState): void {
    if (session.status !== 'completed') {
      return
    }

    const shortId = session.sessionId.slice(0, 4)
    const notification = new Notification({
      title: 'Claude Code task completed',
      body: `${session.project} #${shortId} has finished`,
      silent: true,
    })

    notification.show()
    this.notifiedSessions.delete(session.sessionId)
  }

  clearSession(sessionId: string): void {
    this.notifiedSessions.delete(sessionId)
  }

  clearAll(): void {
    this.notifiedSessions.clear()
  }
}
