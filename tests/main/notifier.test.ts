import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Electron's Notification before importing Notifier
vi.mock('electron', () => ({
  Notification: vi.fn().mockImplementation(() => ({
    show: vi.fn(),
  })),
}))

import { Notifier } from '../../src/main/notifier'
import { Notification } from 'electron'
import type { SessionState } from '../../src/shared/types'

function makeSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: 'session-abc',
    project: 'my-project',
    cwd: '/home/user/my-project',
    terminal: 'iTerm2',
    status: 'idle',
    currentTool: null,
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    toolHistory: [],
    ...overrides,
  }
}

describe('Notifier', () => {
  let notifier: Notifier

  beforeEach(() => {
    notifier = new Notifier()
    vi.clearAllMocks()
  })

  it('should send notification when session enters waiting state', () => {
    const session = makeSession({ status: 'waiting' })
    notifier.notifyIfWaiting(session)

    expect(Notification).toHaveBeenCalledWith({
      title: 'Claude Code needs input',
      body: 'my-project #sess is waiting for your response',
      silent: false,
    })
  })

  it('should not send duplicate notification for same waiting session', () => {
    const session = makeSession({ status: 'waiting' })
    notifier.notifyIfWaiting(session)
    notifier.notifyIfWaiting(session)

    expect(Notification).toHaveBeenCalledTimes(1)
  })

  it('should send notification again after session leaves and re-enters waiting', () => {
    const session = makeSession({ status: 'waiting' })
    notifier.notifyIfWaiting(session)

    // Session becomes active
    notifier.notifyIfWaiting(makeSession({ status: 'thinking' }))

    // Session waits again
    notifier.notifyIfWaiting(makeSession({ status: 'waiting' }))

    expect(Notification).toHaveBeenCalledTimes(2)
  })

  it('should not send notification for non-waiting sessions', () => {
    for (const status of ['idle', 'reading', 'writing', 'thinking', 'completed', 'error'] as const) {
      notifier.notifyIfWaiting(makeSession({ status }))
    }

    expect(Notification).not.toHaveBeenCalled()
  })

  it('should send completion notification', () => {
    const session = makeSession({ status: 'completed' })
    notifier.notifyCompleted(session)

    expect(Notification).toHaveBeenCalledWith({
      title: 'Claude Code task completed',
      body: 'my-project #sess has finished',
      silent: true,
    })
  })

  it('should clear session tracking on clearSession', () => {
    const session = makeSession({ status: 'waiting' })
    notifier.notifyIfWaiting(session)

    notifier.clearSession('session-abc')

    // Should be able to notify again
    notifier.notifyIfWaiting(session)
    expect(Notification).toHaveBeenCalledTimes(2)
  })

  it('should clear all tracking on clearAll', () => {
    notifier.notifyIfWaiting(makeSession({ sessionId: 's1', status: 'waiting' }))
    notifier.notifyIfWaiting(makeSession({ sessionId: 's2', status: 'waiting' }))

    notifier.clearAll()

    notifier.notifyIfWaiting(makeSession({ sessionId: 's1', status: 'waiting' }))
    notifier.notifyIfWaiting(makeSession({ sessionId: 's2', status: 'waiting' }))

    expect(Notification).toHaveBeenCalledTimes(4)
  })
})
