import { app, ipcMain } from 'electron'
import { join } from 'path'
import { IPCServer } from './ipc-server'
import { SessionManager } from './session-manager'
import { TrayController } from './tray-controller'
import { PopoverWindow } from './popover-window'
import { HookInstaller } from './hook-installer'
import { StatsStore } from './stats-store'
import { Notifier } from './notifier'
import { IPC_CHANNELS } from '../shared/types'

// Core components
const ipcServer = new IPCServer()
const sessionManager = new SessionManager()
const trayController = new TrayController()
const popoverWindow = new PopoverWindow()
const notifier = new Notifier()
let statsStore: StatsStore | null = null

function broadcastSessions(): void {
  const sessions = sessionManager.getAll()
  trayController.updateCount(sessions.length)
  popoverWindow.updateHeight(sessions.length)

  const win = popoverWindow.getWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.SESSIONS_UPDATED, sessions)
  }
}

function setupIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_SESSIONS, () => {
    return sessionManager.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.GET_STATS, () => {
    return statsStore?.getStats() ?? []
  })
}

function installHooks(): void {
  // Determine reporter source path (bundled with the app)
  const isDev = !app.isPackaged
  const reporterSource = isDev
    ? join(__dirname, '../../scripts/claude-pulse-reporter.js')
    : join(process.resourcesPath, 'scripts', 'claude-pulse-reporter.js')

  const installer = new HookInstaller(reporterSource)

  if (!installer.isInstalled()) {
    const changed = installer.install()
    if (changed) {
      console.log('[ClaudePulse] Hooks installed to ~/.claude/settings.json')
    }
  } else {
    console.log('[ClaudePulse] Hooks already installed')
  }
}

app.whenReady().then(async () => {
  // Hide dock icon — this is a menu bar app
  app.dock?.hide()

  // Install hooks on first launch
  installHooks()

  // Create tray icon
  trayController.create(() => {
    const bounds = trayController.getBounds()
    popoverWindow.toggle(bounds)
  })

  // Create popover window
  popoverWindow.create()

  // Start session manager (cleanup timer)
  sessionManager.start()

  // Wire session manager events to UI and notifications
  sessionManager.on('updated', (sessions) => {
    broadcastSessions()
    // Send notifications for waiting/completed sessions
    for (const session of sessions) {
      notifier.notifyIfWaiting(session)
      notifier.notifyCompleted(session)
    }
  })
  sessionManager.on('removed', (id: string) => {
    notifier.clearSession(id)
    const win = popoverWindow.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.SESSION_REMOVED, id)
    }
  })

  // Initialize stats store
  statsStore = new StatsStore()

  // Start IPC server and forward messages to session manager + stats
  await ipcServer.start()
  ipcServer.on('message', (msg) => {
    sessionManager.handleMessage(msg)
    if (msg.tool_name) {
      statsStore?.recordToolCall(msg.tool_name)
    }
  })

  // Setup renderer IPC handlers
  setupIpcHandlers()

  // Handle settings updates from renderer
  ipcMain.on(IPC_CHANNELS.UPDATE_SETTINGS, (_event, settings) => {
    notifier.updateSettings(settings)
  })

  console.log('[ClaudePulse] Ready. Listening for Claude Code hook events.')
})

app.on('before-quit', async () => {
  notifier.clearAll()
  sessionManager.stop()
  trayController.destroy()
  popoverWindow.destroy()
  await ipcServer.stop()
})

// Prevent app from quitting when all windows are closed (menu bar app)
app.on('window-all-closed', (e: Event) => {
  e.preventDefault()
})
