import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock child_process execFile for sound
vi.mock('child_process', () => ({
  execFile: vi.fn((_cmd, _args, cb) => { if (cb) cb(null) }),
}))

import { Notifier } from '../../src/main/notifier'
import { execFile } from 'child_process'
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

  it('should play Ping sound when session enters waiting state', () => {
    notifier.notifyIfWaiting(makeSession({ status: 'waiting' }))

    expect(execFile).toHaveBeenCalledWith(
      'afplay',
      ['/System/Library/Sounds/Ping.aiff'],
      expect.any(Function)
    )
  })

  it('should not play duplicate sound for same waiting session', () => {
    notifier.notifyIfWaiting(makeSession({ status: 'waiting' }))
    notifier.notifyIfWaiting(makeSession({ status: 'waiting' }))

    expect(execFile).toHaveBeenCalledTimes(1)
  })

  it('should play sound again after session leaves and re-enters waiting', () => {
    notifier.notifyIfWaiting(makeSession({ status: 'waiting' }))
    notifier.notifyIfWaiting(makeSession({ status: 'thinking' }))

    // Force past debounce
    notifier['lastSoundTime'] = {}

    notifier.notifyIfWaiting(makeSession({ status: 'waiting' }))

    expect(execFile).toHaveBeenCalledTimes(2)
  })

  it('should not play sound for non-waiting sessions', () => {
    for (const status of ['idle', 'reading', 'writing', 'thinking', 'completed', 'error'] as const) {
      notifier.notifyIfWaiting(makeSession({ status }))
    }

    expect(execFile).not.toHaveBeenCalled()
  })

  it('should play Hero sound on completion only once (no spam)', () => {
    notifier.notifyCompleted(makeSession({ status: 'completed' }))
    notifier.notifyCompleted(makeSession({ status: 'completed' }))
    notifier.notifyCompleted(makeSession({ status: 'completed' }))

    expect(execFile).toHaveBeenCalledTimes(1)
    expect(execFile).toHaveBeenCalledWith(
      'afplay',
      ['/System/Library/Sounds/Hero.aiff'],
      expect.any(Function)
    )
  })

  it('should respect notifications disabled setting', () => {
    notifier.updateSettings({ notifications: false, completionNotifications: true })

    notifier.notifyIfWaiting(makeSession({ status: 'waiting' }))
    expect(execFile).not.toHaveBeenCalled()
  })

  it('should respect completion notifications disabled setting', () => {
    notifier.updateSettings({ notifications: true, completionNotifications: false })

    notifier.notifyCompleted(makeSession({ status: 'completed' }))
    expect(execFile).not.toHaveBeenCalled()
  })

  it('should clear session tracking on clearSession', () => {
    notifier.notifyIfWaiting(makeSession({ status: 'waiting' }))

    notifier.clearSession('session-abc')
    notifier['lastSoundTime'] = {} // Reset debounce

    notifier.notifyIfWaiting(makeSession({ status: 'waiting' }))
    expect(execFile).toHaveBeenCalledTimes(2)
  })

  it('should clear all tracking on clearAll', () => {
    notifier.notifyIfWaiting(makeSession({ sessionId: 's1', status: 'waiting' }))

    notifier.clearAll()
    notifier['lastSoundTime'] = {} // Reset debounce

    notifier.notifyIfWaiting(makeSession({ sessionId: 's1', status: 'waiting' }))
    expect(execFile).toHaveBeenCalledTimes(2)
  })
})
