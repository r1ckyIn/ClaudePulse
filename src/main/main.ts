import { app, ipcMain } from 'electron'
import { IPCServer } from './ipc-server'
import { TrayController } from './tray-controller'
import { PopoverWindow } from './popover-window'
import { IPC_CHANNELS } from '../shared/types'
import type { HookMessage, SessionState, SessionStatus } from '../shared/types'
import { TOOL_STATUS_MAP, MAX_TOOL_HISTORY, TIMEOUT_COMPLETED, TIMEOUT_IDLE, TIMEOUT_ACTIVE, CLEANUP_INTERVAL } from '../shared/constants'

// Session store keyed by session_id
const sessions = new Map<string, SessionState>()

// Core components
const ipcServer = new IPCServer()
const trayController = new TrayController()
const popoverWindow = new PopoverWindow()

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function deriveStatus(message: HookMessage): SessionStatus {
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
    default:
      return 'idle'
  }
}

function handleMessage(message: HookMessage): void {
  const now = Date.now()
  const existing = sessions.get(message.session_id)

  if (existing) {
    existing.status = deriveStatus(message)
    existing.lastActivityAt = now
    existing.currentTool = message.tool_name ?? null
    if (message.tool_name) {
      existing.toolHistory.push(message.tool_name)
      if (existing.toolHistory.length > MAX_TOOL_HISTORY) {
        existing.toolHistory.shift()
      }
    }
  } else {
    const session: SessionState = {
      sessionId: message.session_id,
      project: message.project || 'Unknown',
      cwd: message.cwd || '',
      terminal: message.terminal || 'Terminal',
      status: deriveStatus(message),
      currentTool: message.tool_name ?? null,
      startedAt: now,
      lastActivityAt: now,
      toolHistory: message.tool_name ? [message.tool_name] : [],
    }
    sessions.set(message.session_id, session)
  }

  broadcastSessions()
}

function broadcastSessions(): void {
  const sessionList = Array.from(sessions.values())
  trayController.updateCount(sessionList.length)
  popoverWindow.updateHeight(sessionList.length)

  const win = popoverWindow.getWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.SESSIONS_UPDATED, sessionList)
  }
}

function cleanupStaleSessions(): void {
  const now = Date.now()
  let changed = false

  for (const [id, session] of sessions) {
    const elapsed = now - session.lastActivityAt

    const shouldRemove =
      (session.status === 'completed' && elapsed > TIMEOUT_COMPLETED) ||
      (session.status === 'error' && elapsed > TIMEOUT_COMPLETED) ||
      (session.status === 'idle' && elapsed > TIMEOUT_IDLE) ||
      elapsed > TIMEOUT_ACTIVE

    if (shouldRemove) {
      sessions.delete(id)
      changed = true

      const win = popoverWindow.getWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.SESSION_REMOVED, id)
      }
    }
  }

  if (changed) {
    broadcastSessions()
  }
}

function setupIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_SESSIONS, () => {
    return Array.from(sessions.values())
  })

  ipcMain.handle(IPC_CHANNELS.GET_STATS, () => {
    // Placeholder — full stats implemented in Phase 3
    return []
  })
}

app.whenReady().then(async () => {
  // Hide dock icon — this is a menu bar app
  app.dock?.hide()

  // Create tray icon
  trayController.create(() => {
    const bounds = trayController.getBounds()
    popoverWindow.toggle(bounds)
  })

  // Create popover window
  popoverWindow.create()

  // Start IPC server
  await ipcServer.start()
  ipcServer.on('message', handleMessage)

  // Setup renderer IPC handlers
  setupIpcHandlers()

  // Start cleanup timer
  cleanupTimer = setInterval(cleanupStaleSessions, CLEANUP_INTERVAL)

  console.log('[ClaudePulse] Ready. Listening for Claude Code hook events.')
})

app.on('before-quit', async () => {
  if (cleanupTimer) clearInterval(cleanupTimer)
  trayController.destroy()
  popoverWindow.destroy()
  await ipcServer.stop()
})

// Prevent app from quitting when all windows are closed (menu bar app)
app.on('window-all-closed', (e: Event) => {
  e.preventDefault()
})
