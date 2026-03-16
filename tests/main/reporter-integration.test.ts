import { describe, it, expect, afterEach } from 'vitest'
import { spawn } from 'child_process'
import { join } from 'path'
import { IPCServer } from '../../src/main/ipc-server'
import type { HookMessage } from '../../src/shared/types'

const REPORTER_PATH = join(__dirname, '../../scripts/claude-pulse-reporter.js')

function runReporterAsync(hookEvent: string, payload: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [REPORTER_PATH, hookEvent], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()

    child.on('close', () => resolve())
    child.on('error', reject)

    setTimeout(() => {
      child.kill()
      reject(new Error('Reporter timeout'))
    }, 5000)
  })
}

describe('Reporter Integration', () => {
  let server: IPCServer

  afterEach(async () => {
    if (server) {
      await server.stop()
    }
  })

  it('should send session_id from hook stdin JSON to IPC server', async () => {
    server = new IPCServer()
    await server.start()

    const received = await new Promise<HookMessage>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000)

      server.on('message', (msg: HookMessage) => {
        clearTimeout(timeout)
        resolve(msg)
      })

      runReporterAsync('PreToolUse', {
        session_id: 'unique-session-abc123',
        cwd: '/Users/test/my-project',
        tool_name: 'Read',
        tool_input: { file_path: '/tmp/test.ts' },
        transcript_path: '/Users/test/.claude/projects/transcript.jsonl',
      })
    })

    expect(received.session_id).toBe('unique-session-abc123')
    expect(received.hook_event_name).toBe('PreToolUse')
    expect(received.tool_name).toBe('Read')
    expect(received.project).toBe('my-project')
    expect(received.cwd).toBe('/Users/test/my-project')
  })

  it('should correctly identify two different sessions in the same folder', async () => {
    server = new IPCServer()
    await server.start()

    const messages: HookMessage[] = []
    server.on('message', (msg: HookMessage) => {
      messages.push(msg)
    })

    // Session A in /shared-folder
    await runReporterAsync('PreToolUse', {
      session_id: 'session-A-unique',
      cwd: '/Users/test/shared-folder',
      tool_name: 'Edit',
    })

    // Session B in the SAME /shared-folder — different session_id
    await runReporterAsync('PreToolUse', {
      session_id: 'session-B-unique',
      cwd: '/Users/test/shared-folder',
      tool_name: 'Bash',
    })

    // Wait for messages to arrive
    await new Promise((r) => setTimeout(r, 500))

    expect(messages.length).toBe(2)
    expect(messages[0].session_id).toBe('session-A-unique')
    expect(messages[1].session_id).toBe('session-B-unique')

    // Both have the same project name but different session IDs
    expect(messages[0].project).toBe('shared-folder')
    expect(messages[1].project).toBe('shared-folder')
    expect(messages[0].session_id).not.toBe(messages[1].session_id)
  })

  it('should exit silently when session_id is missing', async () => {
    // Reporter should exit with code 0 without crashing
    const child = spawn('node', [REPORTER_PATH, 'PreToolUse'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    child.stdin.write('{"cwd":"/tmp","tool_name":"Read"}')
    child.stdin.end()

    const code = await new Promise<number | null>((resolve) => {
      child.on('close', resolve)
      setTimeout(() => { child.kill(); resolve(null) }, 5000)
    })

    expect(code).toBe(0)
  })

  it('should exit silently on malformed JSON', async () => {
    const child = spawn('node', [REPORTER_PATH, 'PreToolUse'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    child.stdin.write('not-json{{{')
    child.stdin.end()

    const code = await new Promise<number | null>((resolve) => {
      child.on('close', resolve)
      setTimeout(() => { child.kill(); resolve(null) }, 5000)
    })

    expect(code).toBe(0)
  })
})
