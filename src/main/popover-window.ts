import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

const POPOVER_WIDTH = 380
const POPOVER_MAX_HEIGHT = 600
const POPOVER_MIN_HEIGHT = 200

export class PopoverWindow {
  private window: BrowserWindow | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null

  create(): void {
    this.window = new BrowserWindow({
      width: POPOVER_WIDTH,
      height: POPOVER_MIN_HEIGHT,
      show: false,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      transparent: true,
      vibrancy: 'popover',
      alwaysOnTop: true,
      webPreferences: {
        preload: join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    // Hide when losing focus
    this.window.on('blur', () => {
      this.hide()
    })

    // Load renderer
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.window.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  toggle(trayBounds: Electron.Rectangle | null): void {
    if (!this.window) return

    if (this.window.isVisible()) {
      this.hide()
    } else {
      this.show(trayBounds)
    }
  }

  show(trayBounds: Electron.Rectangle | null): void {
    if (!this.window) return

    this.clearHideTimer()

    if (trayBounds) {
      this.positionBelowTray(trayBounds)
    }

    this.window.show()
  }

  hide(): void {
    this.window?.hide()
    this.clearHideTimer()
  }

  isVisible(): boolean {
    return this.window?.isVisible() ?? false
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }

  updateHeight(sessionCount: number): void {
    if (!this.window) return

    // 72px per session card + 48px header + 16px padding
    const contentHeight = Math.max(
      POPOVER_MIN_HEIGHT,
      Math.min(sessionCount * 72 + 64, POPOVER_MAX_HEIGHT)
    )

    const bounds = this.window.getBounds()
    this.window.setBounds({
      ...bounds,
      height: contentHeight,
    })
  }

  destroy(): void {
    this.clearHideTimer()
    this.window?.destroy()
    this.window = null
  }

  private positionBelowTray(trayBounds: Electron.Rectangle): void {
    if (!this.window) return

    const windowBounds = this.window.getBounds()
    const display = screen.getDisplayNearestPoint({
      x: trayBounds.x,
      y: trayBounds.y,
    })

    // Center horizontally below the tray icon
    const x = Math.round(
      trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
    )
    // Position below the menu bar
    const y = trayBounds.y + trayBounds.height + 4

    // Ensure window stays within screen bounds
    const maxX = display.workArea.x + display.workArea.width - windowBounds.width
    const clampedX = Math.max(display.workArea.x, Math.min(x, maxX))

    this.window.setPosition(clampedX, y)
  }

  private clearHideTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  }
}
