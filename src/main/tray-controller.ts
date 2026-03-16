import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'

export class TrayController {
  private tray: Tray | null = null
  private onToggle: (() => void) | null = null
  private activeCount = 0

  create(onToggle: () => void): void {
    this.onToggle = onToggle

    // Use template image for automatic dark/light mode support
    const iconPath = join(__dirname, '../../assets/icons/tray-iconTemplate.png')
    const icon = nativeImage.createFromPath(iconPath)

    // Fallback: create a simple 16x16 icon if asset not found
    const trayIcon = icon.isEmpty() ? this.createFallbackIcon() : icon

    this.tray = new Tray(trayIcon)
    this.tray.setToolTip('ClaudePulse')

    this.tray.on('click', () => {
      this.onToggle?.()
    })

    this.tray.on('right-click', () => {
      this.showContextMenu()
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

  getBounds(): Electron.Rectangle | null {
    return this.tray?.getBounds() ?? null
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }

  private showContextMenu(): void {
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
        label: 'Quit',
        click: () => app.quit(),
      },
    ])

    this.tray?.popUpContextMenu(menu)
  }

  private createFallbackIcon(): Electron.NativeImage {
    // Create a simple 16x16 orange circle icon
    const size = 16
    const canvas = Buffer.alloc(size * size * 4)

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - size / 2
        const dy = y - size / 2
        const dist = Math.sqrt(dx * dx + dy * dy)
        const idx = (y * size + x) * 4

        if (dist < size / 2 - 1) {
          // Warm orange (#d97757)
          canvas[idx] = 0xd9     // R
          canvas[idx + 1] = 0x77 // G
          canvas[idx + 2] = 0x57 // B
          canvas[idx + 3] = 0xff // A
        } else {
          canvas[idx + 3] = 0x00 // Transparent
        }
      }
    }

    return nativeImage.createFromBuffer(canvas, { width: size, height: size })
  }
}
