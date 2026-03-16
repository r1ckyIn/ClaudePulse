import { useState, useEffect } from 'react'

interface Settings {
  notifications: boolean
  completionNotifications: boolean
}

const STORAGE_KEY = 'claudepulse-settings'

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // Use defaults
  }
  return { notifications: true, completionNotifications: true }
}

function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  // Sync to main process so Notifier respects the toggles
  window.claudePulse?.updateSettings(settings)
}

interface ToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function Toggle({ label, description, checked, onChange }: ToggleProps): JSX.Element {
  return (
    <div className="settings-toggle">
      <div className="settings-toggle-text">
        <span className="settings-toggle-label">{label}</span>
        <span className="settings-toggle-desc">{description}</span>
      </div>
      <button
        className={`settings-switch ${checked ? 'settings-switch-on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <span className="settings-switch-thumb" />
      </button>
    </div>
  )
}

export default function SettingsView(): JSX.Element {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Sync initial settings to main process on mount
  useEffect(() => {
    const initial = loadSettings()
    window.claudePulse?.updateSettings(initial)
  }, [])

  return (
    <div className="settings-view">
      <h3 className="settings-title">Settings</h3>

      <Toggle
        label="Input Notifications"
        description="Notify when Claude Code needs your input"
        checked={settings.notifications}
        onChange={(v) => setSettings((s) => ({ ...s, notifications: v }))}
      />

      <Toggle
        label="Completion Notifications"
        description="Notify when a task finishes"
        checked={settings.completionNotifications}
        onChange={(v) => setSettings((s) => ({ ...s, completionNotifications: v }))}
      />

      <div className="settings-info">
        <p className="settings-info-text">
          Socket: /tmp/claude-pulse.sock
        </p>
        <p className="settings-info-text">
          HTTP: localhost:19860-19870
        </p>
      </div>
    </div>
  )
}
