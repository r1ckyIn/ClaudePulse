import { execFile } from 'child_process'
import type { SessionState } from '../shared/types'

export interface NotifierSettings {
  notifications: boolean
  completionNotifications: boolean
}

/**
 * Sound-only notifications (no macOS notification banners).
 * Uses ClaudeGlance's sound scheme: Ping (attention) + Hero (completion).
 */
export class Notifier {
  private notifiedWaiting = new Set<string>()
  private notifiedCompleted = new Set<string>()
  private lastSoundTime: Record<string, number> = {}
  private settings: NotifierSettings = {
    notifications: true,
    completionNotifications: true,
  }

  updateSettings(settings: NotifierSettings): void {
    this.settings = settings
  }

  notifyIfWaiting(session: SessionState): void {
    if (session.status !== 'waiting') {
      this.notifiedWaiting.delete(session.sessionId)
      return
    }

    if (!this.settings.notifications) return
    if (this.notifiedWaiting.has(session.sessionId)) return

    this.notifiedWaiting.add(session.sessionId)
    this.playSound('Ping')
  }

  notifyCompleted(session: SessionState): void {
    if (session.status !== 'completed') return
    if (!this.settings.completionNotifications) return
    if (this.notifiedCompleted.has(session.sessionId)) return

    this.notifiedCompleted.add(session.sessionId)
    this.playSound('Hero')
  }

  private playSound(name: 'Ping' | 'Hero'): void {
    // Debounce: same sound type at most once per 10 seconds (like ClaudeGlance)
    const now = Date.now()
    if (this.lastSoundTime[name] && now - this.lastSoundTime[name] < 10_000) {
      return
    }
    this.lastSoundTime[name] = now

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
