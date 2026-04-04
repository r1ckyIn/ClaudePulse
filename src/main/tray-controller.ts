import { Tray, Menu, nativeImage, app } from 'electron'

export class TrayController {
  private tray: Tray | null = null
  private activeCount = 0
  private soundEnabled = true
  private onSoundToggle: ((enabled: boolean) => void) | null = null
  private onToggleHUD: (() => void) | null = null

  create(callbacks: {
    onSoundToggle: (enabled: boolean) => void
    onToggleHUD: () => void
  }): void {
    this.onSoundToggle = callbacks.onSoundToggle
    this.onToggleHUD = callbacks.onToggleHUD

    const trayIcon = this.createAnthropicIcon()
    this.tray = new Tray(trayIcon)
    this.tray.setToolTip('ClaudePulse')

    this.tray.on('click', () => {
      this.showMenu()
    })

    this.tray.on('right-click', () => {
      this.showMenu()
    })
  }

  updateCount(count: number): void {
    this.activeCount = count
    if (this.tray) {
      this.tray.setTitle(count > 0 ? `${count}` : '')
      this.tray.setToolTip(
        count > 0
          ? `ClaudePulse: ${count} active session${count > 1 ? 's' : ''}`
          : 'ClaudePulse: No active sessions'
      )
    }
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }

  private showMenu(): void {
    const menu = Menu.buildFromTemplate([
      {
        label: `ClaudePulse v${app.getVersion()}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: `${this.activeCount} Active Session${this.activeCount !== 1 ? 's' : ''}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Show/Hide HUD',
        click: () => this.onToggleHUD?.(),
      },
      {
        label: 'Sound Notifications',
        type: 'checkbox',
        checked: this.soundEnabled,
        click: (item) => {
          this.soundEnabled = item.checked
          this.onSoundToggle?.(item.checked)
        },
      },
      { type: 'separator' },
      {
        label: 'Quit ClaudePulse',
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit(),
      },
    ])

    this.tray?.popUpContextMenu(menu)
  }

  /**
   * Anthropic-style sparkle/star icon in warm orange.
   * Based on the ✦ motif from Claude branding.
   */
  private createAnthropicIcon(): Electron.NativeImage {
    const size = 32
    const canvas = Buffer.alloc(size * size * 4)
    const cx = size / 2
    const cy = size / 2

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4
        const dx = x - cx
        const dy = y - cy

        // 4-pointed star shape (Anthropic sparkle ✦)
        const ax = Math.abs(dx)
        const ay = Math.abs(dy)

        // Star formula: along axes the star extends further
        const axisStrength = Math.max(
          Math.max(0, 1 - ax / 13) * Math.max(0, 1 - ay / 3.5),
          Math.max(0, 1 - ay / 13) * Math.max(0, 1 - ax / 3.5)
        )

        // Small center dot
        const dist = Math.sqrt(dx * dx + dy * dy)
        const centerDot = Math.max(0, 1 - dist / 4)

        const alpha = Math.min(1, axisStrength + centerDot)

        if (alpha > 0.05) {
          // Warm orange (#d97757)
          canvas[idx] = 0xd9
          canvas[idx + 1] = 0x77
          canvas[idx + 2] = 0x57
          canvas[idx + 3] = Math.round(alpha * 255)
        }
      }
    }

    return nativeImage.createFromBuffer(canvas, {
      width: size,
      height: size,
      scaleFactor: 2.0,
    })
  }
}
