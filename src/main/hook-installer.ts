import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, chmodSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const CLAUDE_DIR = join(homedir(), '.claude')
const HOOKS_DIR = join(CLAUDE_DIR, 'hooks')
const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json')
const REPORTER_FILENAME = 'claude-pulse-reporter.js'

interface HookEntry {
  type: string
  command: string
}

interface HookMatcher {
  matcher?: string
  hooks: HookEntry[]
}

interface ClaudeSettings {
  hooks?: Record<string, HookMatcher[]>
  [key: string]: unknown
}

export class HookInstaller {
  private reporterSourcePath: string

  constructor(reporterSourcePath: string) {
    this.reporterSourcePath = reporterSourcePath
  }

  /**
   * Install the reporter script and register hooks in settings.json.
   * Returns true if changes were made, false if already installed.
   */
  install(): boolean {
    this.ensureDirectories()
    this.installReporter()
    return this.registerHooks()
  }

  /**
   * Remove ClaudePulse hooks from settings.json and delete reporter.
   */
  uninstall(): void {
    this.unregisterHooks()
    this.removeReporter()
  }

  isInstalled(): boolean {
    const reporterPath = join(HOOKS_DIR, REPORTER_FILENAME)
    if (!existsSync(reporterPath)) return false

    if (!existsSync(SETTINGS_PATH)) return false

    const settings = this.readSettings()
    return this.hasClaudePulseHooks(settings)
  }

  private ensureDirectories(): void {
    if (!existsSync(HOOKS_DIR)) {
      mkdirSync(HOOKS_DIR, { recursive: true })
    }
  }

  private installReporter(): void {
    const dest = join(HOOKS_DIR, REPORTER_FILENAME)
    copyFileSync(this.reporterSourcePath, dest)
    chmodSync(dest, 0o755)
  }

  private removeReporter(): void {
    const dest = join(HOOKS_DIR, REPORTER_FILENAME)
    if (existsSync(dest)) {
      const { unlinkSync } = require('fs')
      unlinkSync(dest)
    }
  }

  private registerHooks(): boolean {
    const settings = this.readSettings()

    if (this.hasClaudePulseHooks(settings)) {
      return false // Already installed
    }

    if (!settings.hooks) {
      settings.hooks = {}
    }

    const reporterPath = join(HOOKS_DIR, REPORTER_FILENAME)
    const hookEvents = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop']

    for (const event of hookEvents) {
      if (!settings.hooks[event]) {
        settings.hooks[event] = []
      }

      const command = `node "${reporterPath}" ${event}`

      // Check if this exact command already exists
      const exists = settings.hooks[event].some((matcher) =>
        matcher.hooks.some((h) => h.command === command)
      )

      if (!exists) {
        settings.hooks[event].push({
          matcher: '*',
          hooks: [{ type: 'command', command }],
        })
      }
    }

    this.writeSettings(settings)
    return true
  }

  private unregisterHooks(): void {
    if (!existsSync(SETTINGS_PATH)) return

    const settings = this.readSettings()
    if (!settings.hooks) return

    for (const event of Object.keys(settings.hooks)) {
      settings.hooks[event] = settings.hooks[event].filter(
        (matcher) => !matcher.hooks.some((h) => h.command.includes('claude-pulse-reporter'))
      )

      // Remove empty arrays
      if (settings.hooks[event].length === 0) {
        delete settings.hooks[event]
      }
    }

    this.writeSettings(settings)
  }

  private hasClaudePulseHooks(settings: ClaudeSettings): boolean {
    if (!settings.hooks) return false

    return Object.values(settings.hooks).some((matchers) =>
      matchers.some((matcher) =>
        matcher.hooks.some((h) => h.command.includes('claude-pulse-reporter'))
      )
    )
  }

  private readSettings(): ClaudeSettings {
    if (!existsSync(SETTINGS_PATH)) {
      return {}
    }
    try {
      return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'))
    } catch {
      return {}
    }
  }

  private writeSettings(settings: ClaudeSettings): void {
    // Back up before writing
    if (existsSync(SETTINGS_PATH)) {
      const backupPath = SETTINGS_PATH + '.bak'
      copyFileSync(SETTINGS_PATH, backupPath)
    }

    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf8')
  }
}
