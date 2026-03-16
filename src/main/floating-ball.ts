import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

// ClaudeGlance-style HUD: dark floating panel, always on top
const HUD_WIDTH = 320
const HUD_BASE_HEIGHT = 60
const SESSION_CARD_HEIGHT = 56
const MAX_SESSIONS_VISIBLE = 8
const MARGIN = 16

export class FloatingBall {
  private window: BrowserWindow | null = null

  create(): void {
    const display = screen.getPrimaryDisplay()
    const { width: screenW } = display.workAreaSize

    // Position at top-right like ClaudeGlance
    const x = screenW - HUD_WIDTH - MARGIN
    const y = MARGIN

    this.window = new BrowserWindow({
      width: HUD_WIDTH,
      height: HUD_BASE_HEIGHT,
      x,
      y,
      show: false,
      frame: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      transparent: true,
      hasShadow: true,
      alwaysOnTop: true,
      visibleOnAllWorkspaces: true,
      movable: true,
      webPreferences: {
        preload: join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    // Load renderer
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    this.window.once('ready-to-show', () => {
      this.window?.show()
    })
  }

  // No expand/collapse — always shows the HUD panel
  toggle(): void {
    if (!this.window) return
    if (this.window.isVisible()) {
      this.window.hide()
    } else {
      this.window.show()
    }
  }

  isExpanded(): boolean {
    return true // HUD is always "expanded"
  }

  updateExpandedHeight(sessionCount: number): void {
    if (!this.window) return

    const clampedCount = Math.min(sessionCount, MAX_SESSIONS_VISIBLE)
    const height = clampedCount > 0
      ? clampedCount * SESSION_CARD_HEIGHT + 16
      : HUD_BASE_HEIGHT

    const bounds = this.window.getBounds()
    this.window.setBounds({ ...bounds, height })
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }

  destroy(): void {
    this.window?.destroy()
    this.window = null
  }
}
