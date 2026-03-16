import { createServer, Server, Socket } from 'net'
import { createServer as createHttpServer, IncomingMessage, ServerResponse, Server as HttpServer } from 'http'
import { existsSync, unlinkSync } from 'fs'
import { EventEmitter } from 'events'
import { SOCKET_PATH, HTTP_PORT_START, HTTP_PORT_END } from '../shared/constants'
import type { HookMessage } from '../shared/types'

export class IPCServer extends EventEmitter {
  private socketServer: Server | null = null
  private httpServer: HttpServer | null = null
  private httpPort: number | null = null

  async start(): Promise<void> {
    await this.startSocketServer()
    await this.startHttpServer()
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      let pending = 2

      const done = (): void => {
        if (--pending <= 0) resolve()
      }

      if (this.socketServer) {
        this.socketServer.close(() => done())
      } else {
        done()
      }

      if (this.httpServer) {
        this.httpServer.close(() => done())
      } else {
        done()
      }

      // Clean up socket file
      this.cleanupSocket()
    })
  }

  getHttpPort(): number | null {
    return this.httpPort
  }

  private async startSocketServer(): Promise<void> {
    this.cleanupSocket()

    return new Promise((resolve, reject) => {
      this.socketServer = createServer((socket: Socket) => {
        this.handleSocketConnection(socket)
      })

      this.socketServer.on('error', (err) => {
        console.error('[IPCServer] Socket server error:', err.message)
        reject(err)
      })

      this.socketServer.listen(SOCKET_PATH, () => {
        console.log(`[IPCServer] Unix socket listening: ${SOCKET_PATH}`)
        resolve()
      })
    })
  }

  private async startHttpServer(): Promise<void> {
    for (let port = HTTP_PORT_START; port <= HTTP_PORT_END; port++) {
      try {
        await this.tryHttpPort(port)
        this.httpPort = port
        console.log(`[IPCServer] HTTP fallback listening: localhost:${port}`)
        return
      } catch {
        // Port in use, try next
      }
    }
    console.warn('[IPCServer] No HTTP fallback port available')
  }

  private tryHttpPort(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleHttpRequest(req, res)
      })

      this.httpServer.on('error', reject)

      this.httpServer.listen(port, '127.0.0.1', () => {
        resolve()
      })
    })
  }

  private handleSocketConnection(socket: Socket): void {
    let data = ''
    let processed = false

    socket.on('data', (chunk) => {
      data += chunk.toString()
    })

    socket.on('end', () => {
      if (!processed && data) {
        processed = true
        this.processMessage(data)
      }
    })

    socket.on('close', () => {
      if (!processed && data) {
        processed = true
        this.processMessage(data)
      }
    })

    socket.on('error', (err) => {
      console.error('[IPCServer] Socket connection error:', err.message)
    })
  }

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end()
      return
    }

    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      this.processMessage(body)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
    })
  }

  private processMessage(raw: string): void {
    try {
      const message = JSON.parse(raw.trim()) as HookMessage

      if (!message.session_id || !message.hook_event_name) {
        return
      }

      this.emit('message', message)
    } catch {
      // Silently ignore malformed messages
    }
  }

  private cleanupSocket(): void {
    if (existsSync(SOCKET_PATH)) {
      try {
        unlinkSync(SOCKET_PATH)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
