import { describe, it, expect, afterEach } from 'vitest'
import { createConnection } from 'net'
import { IPCServer } from '../../src/main/ipc-server'
import { SOCKET_PATH } from '../../src/shared/constants'
import type { HookMessage } from '../../src/shared/types'

describe('IPCServer', () => {
  let server: IPCServer

  afterEach(async () => {
    if (server) {
      await server.stop()
    }
  })

  it('should start and listen on Unix socket', async () => {
    server = new IPCServer()
    await server.start()

    // Verify socket is accessible by connecting
    const connected = await new Promise<boolean>((resolve) => {
      const client = createConnection(SOCKET_PATH, () => {
        client.end()
        resolve(true)
      })
      client.on('error', () => resolve(false))
    })

    expect(connected).toBe(true)
  })

  it('should emit message events for valid JSON on socket', async () => {
    server = new IPCServer()
    await server.start()

    const received = await new Promise<HookMessage>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 3000)

      server.on('message', (msg: HookMessage) => {
        clearTimeout(timeout)
        resolve(msg)
      })

      const client = createConnection(SOCKET_PATH, () => {
        const payload = JSON.stringify({
          session_id: 'test-session-123',
          hook_event_name: 'PreToolUse',
          cwd: '/tmp/test',
          project: 'test-project',
          terminal: 'iTerm2',
          timestamp: Date.now(),
          tool_name: 'Read',
        })
        client.write(payload)
        client.end()
      })
    })

    expect(received.session_id).toBe('test-session-123')
    expect(received.hook_event_name).toBe('PreToolUse')
    expect(received.tool_name).toBe('Read')
  })

  it('should ignore malformed JSON', async () => {
    server = new IPCServer()
    await server.start()

    let messageReceived = false
    server.on('message', () => {
      messageReceived = true
    })

    await new Promise<void>((resolve) => {
      const client = createConnection(SOCKET_PATH, () => {
        client.write('not-json{{{')
        client.end()
      })
      client.on('close', () => {
        setTimeout(() => resolve(), 200)
      })
    })

    expect(messageReceived).toBe(false)
  })

  it('should ignore messages missing session_id', async () => {
    server = new IPCServer()
    await server.start()

    let messageReceived = false
    server.on('message', () => {
      messageReceived = true
    })

    await new Promise<void>((resolve) => {
      const client = createConnection(SOCKET_PATH, () => {
        client.write(JSON.stringify({ hook_event_name: 'PreToolUse' }))
        client.end()
      })
      client.on('close', () => {
        setTimeout(() => resolve(), 200)
      })
    })

    expect(messageReceived).toBe(false)
  })

  it('should start HTTP fallback server', async () => {
    server = new IPCServer()
    await server.start()

    const port = server.getHttpPort()
    expect(port).not.toBeNull()
    expect(port).toBeGreaterThanOrEqual(19860)
  })

  it('should receive messages via HTTP POST', async () => {
    server = new IPCServer()
    await server.start()

    const port = server.getHttpPort()!

    const received = await new Promise<HookMessage>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 3000)

      server.on('message', (msg: HookMessage) => {
        clearTimeout(timeout)
        resolve(msg)
      })

      const payload = JSON.stringify({
        session_id: 'http-session-456',
        hook_event_name: 'PostToolUse',
        cwd: '/tmp/http-test',
        project: 'http-project',
        terminal: 'VSCode',
        timestamp: Date.now(),
        tool_name: 'Edit',
      })

      // Use native http module to POST
      const http = require('http')
      const req = http.request(
        { hostname: '127.0.0.1', port, path: '/api/status', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        () => {}
      )
      req.write(payload)
      req.end()
    })

    expect(received.session_id).toBe('http-session-456')
    expect(received.hook_event_name).toBe('PostToolUse')
  })

  it('should handle multiple concurrent connections', async () => {
    server = new IPCServer()
    await server.start()

    const messages: HookMessage[] = []
    server.on('message', (msg: HookMessage) => {
      messages.push(msg)
    })

    // Send 5 messages concurrently
    const sends = Array.from({ length: 5 }, (_, i) =>
      new Promise<void>((resolve) => {
        const client = createConnection(SOCKET_PATH, () => {
          client.write(
            JSON.stringify({
              session_id: `concurrent-${i}`,
              hook_event_name: 'PreToolUse',
              cwd: '/tmp',
              project: 'test',
              terminal: 'test',
              timestamp: Date.now(),
            })
          )
          client.end()
        })
        client.on('close', () => resolve())
      })
    )

    await Promise.all(sends)

    // Give a moment for all messages to be processed
    await new Promise((r) => setTimeout(r, 300))

    expect(messages.length).toBe(5)
    const ids = messages.map((m) => m.session_id).sort()
    expect(ids).toEqual(['concurrent-0', 'concurrent-1', 'concurrent-2', 'concurrent-3', 'concurrent-4'])
  })
})
