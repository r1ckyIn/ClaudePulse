import { app, ipcMain } from 'electron'
import { join } from 'path'
import { IPCServer } from './ipc-server'
import { SessionManager } from './session-manager'
import { FloatingBall } from './floating-ball'
import { TrayController } from './tray-controller'
import { HookInstaller } from './hook-installer'
import { StatsStore } from './stats-store'
import { Notifier } from './notifier'
import { IPC_CHANNELS } from '../shared/types'

// Core components
const ipcServer = new IPCServer()
const sessionManager = new SessionManager()
const floatingBall = new FloatingBall()
const trayController = new TrayController()
const notifier = new Notifier()
let statsStore: StatsStore | null = null

function broadcastSessions(): void {
  const sessions = sessionManager.getAll()
  trayController.updateCount(sessions.length)

  if (floatingBall.isExpanded()) {
    floatingBall.updateExpandedHeight(sessions.length)
  }

  const win = floatingBall.getWindow()
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

  ipcMain.on(IPC_CHANNELS.TOGGLE_WINDOW, () => {
    floatingBall.toggle()
  })

  ipcMain.on(IPC_CHANNELS.UPDATE_SETTINGS, (_event, settings) => {
    notifier.updateSettings(settings)
  })
}

function installHooks(): void {
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
  // Hide dock icon — floating ball + tray app
  app.dock?.hide()

  // Install hooks on first launch
  installHooks()

  // Create tray icon for settings (like ClaudeGlance)
  trayController.create({
    onSoundToggle: (soundEnabled) => {
      notifier.updateSettings({
        notifications: soundEnabled,
        completionNotifications: soundEnabled,
      })
    },
    onToggleHUD: () => {
      floatingBall.toggle()
    },
  })

  // Create floating ball (main monitoring UI)
  floatingBall.create()

  // Start session manager
  sessionManager.start()

  // Wire session events
  sessionManager.on('updated', (sessions) => {
    broadcastSessions()
    for (const session of sessions) {
      notifier.notifyIfWaiting(session)
      notifier.notifyCompleted(session)
    }
  })
  sessionManager.on('removed', (id: string) => {
    notifier.clearSession(id)
    const win = floatingBall.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.SESSION_REMOVED, id)
    }
  })

  // Initialize stats store
  statsStore = new StatsStore()

  // Start IPC server
  await ipcServer.start()
  ipcServer.on('message', (msg) => {
    sessionManager.handleMessage(msg)
    if (msg.tool_name) {
      statsStore?.recordToolCall(msg.tool_name)
    }
  })

  // Setup renderer IPC handlers
  setupIpcHandlers()

  console.log('[ClaudePulse] Ready. Floating ball + tray active.')
})

app.on('before-quit', async () => {
  notifier.clearAll()
  sessionManager.stop()
  trayController.destroy()
  floatingBall.destroy()
  await ipcServer.stop()
})

app.on('window-all-closed', (e: Event) => {
  e.preventDefault()
})
