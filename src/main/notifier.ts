import { Notification } from 'electron'
import { execFile } from 'child_process'
import type { SessionState } from '../shared/types'

export interface NotifierSettings {
  notifications: boolean
  completionNotifications: boolean
}

/**
 * Sends macOS system notifications when Claude Code needs user input.
 * Tracks which sessions have already been notified to avoid duplicates.
 */
export class Notifier {
  private notifiedWaiting = new Set<string>()
  private notifiedCompleted = new Set<string>()
  private settings: NotifierSettings = {
    notifications: true,
    completionNotifications: true,
  }

  updateSettings(settings: NotifierSettings): void {
    this.settings = settings
  }

  notifyIfWaiting(session: SessionState): void {
    if (session.status !== 'waiting') {
      // Clear notification state when session is no longer waiting
      this.notifiedWaiting.delete(session.sessionId)
      return
    }

    if (!this.settings.notifications) return
    if (this.notifiedWaiting.has(session.sessionId)) return

    this.notifiedWaiting.add(session.sessionId)

    const shortId = session.sessionId.slice(0, 4)
    const notification = new Notification({
      title: 'Claude Code needs input',
      body: `${session.project} #${shortId} is waiting for your response`,
      silent: false,
    })

    notification.show()
    this.playSound('Ping')
  }

  notifyCompleted(session: SessionState): void {
    if (session.status !== 'completed') return
    if (!this.settings.completionNotifications) return
    if (this.notifiedCompleted.has(session.sessionId)) return

    this.notifiedCompleted.add(session.sessionId)

    const shortId = session.sessionId.slice(0, 4)
    const notification = new Notification({
      title: 'Claude Code task completed',
      body: `${session.project} #${shortId} has finished`,
      silent: false,
    })

    notification.show()
    this.playSound('Hero')
  }

  private playSound(name: 'Ping' | 'Hero'): void {
    // Use same macOS system sounds as ClaudeGlance
    // Ping = attention/waiting, Hero = completion
    const soundPath = `/System/Library/Sounds/${name}.aiff`
    execFile('afplay', [soundPath], () => {
      // Silent fail — sound is non-critical
    })
  }

  clearSession(sessionId: string): void {
    this.notifiedWaiting.delete(sessionId)
    this.notifiedCompleted.delete(sessionId)
  }

  clearAll(): void {
    this.notifiedWaiting.clear()
    this.notifiedCompleted.clear()
  }
}
