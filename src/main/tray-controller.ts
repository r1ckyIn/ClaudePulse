import { Tray, Menu, nativeImage, app } from 'electron'

export class TrayController {
  private tray: Tray | null = null
  private activeCount = 0
  private soundEnabled = true
  private onSoundToggle: ((enabled: boolean) => void) | null = null

  create(onSoundToggle: (enabled: boolean) => void): void {
    this.onSoundToggle = onSoundToggle

    const trayIcon = this.createAtomIcon()
    this.tray = new Tray(trayIcon)
    this.tray.setToolTip('ClaudePulse')

    // Click opens the settings menu (like ClaudeGlance)
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
   * Create an atom/orbital style icon in Anthropic warm orange.
   * 16x16 template icon with orbital rings around a center dot.
   */
  private createAtomIcon(): Electron.NativeImage {
    const size = 32
    const canvas = Buffer.alloc(size * size * 4)
    const cx = size / 2
    const cy = size / 2

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4
        const dx = x - cx
        const dy = y - cy

        // Center nucleus (solid dot)
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 3.5) {
          canvas[idx] = 0xd9
          canvas[idx + 1] = 0x77
          canvas[idx + 2] = 0x57
          canvas[idx + 3] = 0xff
          continue
        }

        // Orbital ring 1 (horizontal ellipse)
        const e1x = dx / 12
        const e1y = dy / 5
        const ring1 = Math.abs(Math.sqrt(e1x * e1x + e1y * e1y) - 1)

        // Orbital ring 2 (tilted ellipse ~60 degrees)
        const angle2 = Math.PI / 3
        const rx2 = dx * Math.cos(angle2) + dy * Math.sin(angle2)
        const ry2 = -dx * Math.sin(angle2) + dy * Math.cos(angle2)
        const e2x = rx2 / 12
        const e2y = ry2 / 5
        const ring2 = Math.abs(Math.sqrt(e2x * e2x + e2y * e2y) - 1)

        // Orbital ring 3 (tilted ellipse ~-60 degrees)
        const angle3 = -Math.PI / 3
        const rx3 = dx * Math.cos(angle3) + dy * Math.sin(angle3)
        const ry3 = -dx * Math.sin(angle3) + dy * Math.cos(angle3)
        const e3x = rx3 / 12
        const e3y = ry3 / 5
        const ring3 = Math.abs(Math.sqrt(e3x * e3x + e3y * e3y) - 1)

        const minRing = Math.min(ring1, ring2, ring3)
        if (minRing < 0.12) {
          const alpha = Math.max(0, 1 - minRing / 0.12)
          canvas[idx] = 0xd9
          canvas[idx + 1] = 0x77
          canvas[idx + 2] = 0x57
          canvas[idx + 3] = Math.round(alpha * 255)
        } else {
          canvas[idx + 3] = 0x00
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
