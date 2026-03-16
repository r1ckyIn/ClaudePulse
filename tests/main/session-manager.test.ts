import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SessionManager } from '../../src/main/session-manager'
import type { HookMessage } from '../../src/shared/types'

function makeMessage(overrides: Partial<HookMessage> = {}): HookMessage {
  return {
    session_id: 'session-abc',
    cwd: '/home/user/project',
    project: 'project',
    terminal: 'iTerm2',
    timestamp: Date.now(),
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
    ...overrides,
  }
}

describe('SessionManager', () => {
  let manager: SessionManager

  beforeEach(() => {
    manager = new SessionManager()
  })

  afterEach(() => {
    manager.stop()
  })

  it('should create a new session on first message', () => {
    manager.handleMessage(makeMessage())

    const sessions = manager.getAll()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].sessionId).toBe('session-abc')
    expect(sessions[0].project).toBe('project')
    expect(sessions[0].status).toBe('reading')
  })

  it('should update existing session on subsequent messages', () => {
    manager.handleMessage(makeMessage())
    manager.handleMessage(makeMessage({ tool_name: 'Edit' }))

    const sessions = manager.getAll()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].status).toBe('writing')
    expect(sessions[0].currentTool).toBe('Edit')
  })

  it('should track multiple sessions independently', () => {
    manager.handleMessage(makeMessage({ session_id: 'session-1' }))
    manager.handleMessage(makeMessage({ session_id: 'session-2' }))
    manager.handleMessage(makeMessage({ session_id: 'session-3' }))

    expect(manager.getCount()).toBe(3)

    const s1 = manager.getById('session-1')
    const s2 = manager.getById('session-2')
    expect(s1).toBeDefined()
    expect(s2).toBeDefined()
    expect(s1?.sessionId).not.toBe(s2?.sessionId)
  })

  it('should handle same-folder multiple instances (core fix)', () => {
    // Two Claude Code instances in the same directory
    manager.handleMessage(
      makeMessage({
        session_id: 'instance-A',
        cwd: '/home/user/same-project',
        project: 'same-project',
      })
    )
    manager.handleMessage(
      makeMessage({
        session_id: 'instance-B',
        cwd: '/home/user/same-project',
        project: 'same-project',
      })
    )

    const sessions = manager.getAll()
    expect(sessions).toHaveLength(2)

    const ids = sessions.map((s) => s.sessionId).sort()
    expect(ids).toEqual(['instance-A', 'instance-B'])

    // Both have the same project name
    expect(sessions[0].project).toBe('same-project')
    expect(sessions[1].project).toBe('same-project')
  })

  it('should derive reading status for Read/Glob/Grep tools', () => {
    for (const tool of ['Read', 'Glob', 'Grep']) {
      manager.handleMessage(
        makeMessage({ session_id: `s-${tool}`, tool_name: tool })
      )
      expect(manager.getById(`s-${tool}`)?.status).toBe('reading')
    }
  })

  it('should derive writing status for Edit/Write tools', () => {
    for (const tool of ['Edit', 'Write', 'MultiEdit']) {
      manager.handleMessage(
        makeMessage({ session_id: `s-${tool}`, tool_name: tool })
      )
      expect(manager.getById(`s-${tool}`)?.status).toBe('writing')
    }
  })

  it('should derive thinking status for Bash/Agent tools', () => {
    for (const tool of ['Bash', 'Agent']) {
      manager.handleMessage(
        makeMessage({ session_id: `s-${tool}`, tool_name: tool })
      )
      expect(manager.getById(`s-${tool}`)?.status).toBe('thinking')
    }
  })

  it('should set waiting status on Notification', () => {
    manager.handleMessage(
      makeMessage({ hook_event_name: 'Notification', tool_name: undefined })
    )
    expect(manager.getAll()[0].status).toBe('waiting')
  })

  it('should set completed status on Stop', () => {
    manager.handleMessage(makeMessage())
    manager.handleMessage(
      makeMessage({ hook_event_name: 'Stop', tool_name: undefined })
    )
    expect(manager.getAll()[0].status).toBe('completed')
  })

  it('should maintain tool history with max limit', () => {
    for (let i = 0; i < 15; i++) {
      manager.handleMessage(makeMessage({ tool_name: `Tool${i}` }))
    }

    const session = manager.getAll()[0]
    expect(session.toolHistory.length).toBe(10)
    expect(session.toolHistory[0]).toBe('Tool5')
    expect(session.toolHistory[9]).toBe('Tool14')
  })

  it('should emit updated event on new messages', () => {
    const listener = vi.fn()
    manager.on('updated', listener)

    manager.handleMessage(makeMessage())
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ sessionId: 'session-abc' }),
    ]))
  })

  it('should update project/cwd when they change', () => {
    manager.handleMessage(makeMessage({
      cwd: '/home/user/old-project',
      project: 'old-project',
    }))

    manager.handleMessage(makeMessage({
      cwd: '/home/user/new-project',
      project: 'new-project',
    }))

    const session = manager.getAll()[0]
    expect(session.cwd).toBe('/home/user/new-project')
    expect(session.project).toBe('new-project')
  })

  it('should extract project from cwd when project is empty', () => {
    manager.handleMessage(makeMessage({
      project: '',
      cwd: '/home/user/my-cool-app',
    }))

    expect(manager.getAll()[0].project).toBe('my-cool-app')
  })
})
