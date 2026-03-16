import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

const BALL_SIZE = 56
const EXPANDED_WIDTH = 380
const EXPANDED_MAX_HEIGHT = 520
const EXPANDED_MIN_HEIGHT = 200
const MARGIN = 12

export class FloatingBall {
  private window: BrowserWindow | null = null
  private expanded = false
  private ballPosition: { x: number; y: number } | null = null

  create(): void {
    const display = screen.getPrimaryDisplay()
    const { width: screenW, height: screenH } = display.workAreaSize

    // Start at right side, vertically centered
    const x = screenW - BALL_SIZE - MARGIN
    const y = Math.round(screenH / 2 - BALL_SIZE / 2)

    this.ballPosition = { x, y }

    this.window = new BrowserWindow({
      width: BALL_SIZE,
      height: BALL_SIZE,
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
      hasShadow: false,
      alwaysOnTop: true,
      visibleOnAllWorkspaces: true,
      webPreferences: {
        preload: join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    // Make the ball draggable but track position
    this.window.on('moved', () => {
      if (this.window && !this.expanded) {
        const [nx, ny] = this.window.getPosition()
        this.ballPosition = { x: nx, y: ny }
      }
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

  toggle(): void {
    if (!this.window) return

    if (this.expanded) {
      this.collapse()
    } else {
      this.expand()
    }
  }

  expand(): void {
    if (!this.window || this.expanded) return
    this.expanded = true

    const display = screen.getPrimaryDisplay()
    const { width: screenW } = display.workAreaSize

    // Save ball position before expanding
    const [bx, by] = this.window.getPosition()
    this.ballPosition = { x: bx, y: by }

    // Expand from ball position, anchored to the right
    const expandX = Math.min(bx, screenW - EXPANDED_WIDTH - MARGIN)
    const expandY = by

    this.window.setResizable(true)
    this.window.setBounds({
      x: expandX,
      y: expandY,
      width: EXPANDED_WIDTH,
      height: EXPANDED_MIN_HEIGHT,
    })
    this.window.setResizable(false)

    this.window.webContents.send('floating:expanded', true)
  }

  collapse(): void {
    if (!this.window || !this.expanded) return
    this.expanded = false

    const pos = this.ballPosition || { x: 100, y: 100 }

    this.window.setResizable(true)
    this.window.setBounds({
      x: pos.x,
      y: pos.y,
      width: BALL_SIZE,
      height: BALL_SIZE,
    })
    this.window.setResizable(false)

    this.window.webContents.send('floating:expanded', false)
  }

  isExpanded(): boolean {
    return this.expanded
  }

  updateExpandedHeight(sessionCount: number): void {
    if (!this.window || !this.expanded) return

    const contentHeight = Math.max(
      EXPANDED_MIN_HEIGHT,
      Math.min(sessionCount * 72 + 100, EXPANDED_MAX_HEIGHT)
    )

    const bounds = this.window.getBounds()
    this.window.setResizable(true)
    this.window.setBounds({ ...bounds, height: contentHeight })
    this.window.setResizable(false)
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }

  destroy(): void {
    this.window?.destroy()
    this.window = null
  }
}
