import { useState, useEffect } from 'react'
import type { SessionState } from '../shared/types'
import type { ClaudePulseAPI } from '../main/preload'
import './styles/global.css'

declare global {
  interface Window {
    claudePulse: ClaudePulseAPI
  }
}

// 4x4 Pixel Spinner (like ClaudeGlance)
function PixelSpinner({ status }: { status: string }): JSX.Element {
  const colorMap: Record<string, string> = {
    reading: '#6ae4ff',
    writing: '#b388ff',
    thinking: '#ffb74d',
    waiting: '#ffd54f',
    completed: '#81c784',
    error: '#ef5350',
    idle: '#666',
  }
  const color = colorMap[status] || colorMap.idle
  const animClass = `spinner-${status}`

  return (
    <div className={`pixel-spinner ${animClass}`}>
      {Array.from({ length: 16 }, (_, i) => (
        <div
          key={i}
          className="pixel"
          style={{ backgroundColor: color, animationDelay: `${i * 0.05}s` }}
        />
      ))}
    </div>
  )
}

function formatElapsed(startedAt: number): string {
  const s = Math.floor((Date.now() - startedAt) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`
}

function SessionCard({ session }: { session: SessionState }): JSX.Element {
  const shortId = session.sessionId.slice(0, 4)

  const statusText = session.status === 'waiting'
    ? 'Waiting for response...'
    : session.status === 'completed'
      ? 'Task completed'
      : session.currentTool
        ? `${session.currentTool}`
        : session.status

  return (
    <div className="hud-card">
      <PixelSpinner status={session.status} />
      <div className="hud-card-info">
        <div className="hud-card-action">{statusText}</div>
        <div className="hud-card-meta">
          <span className="hud-project">{session.project}</span>
          <span className="hud-separator">·</span>
          <span className="hud-id">#{shortId}</span>
          <span className="hud-separator">·</span>
          <span className="hud-elapsed">{formatElapsed(session.startedAt)}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyHUD(): JSX.Element {
  return (
    <div className="hud-empty">
      <PixelSpinner status="idle" />
      <span className="hud-empty-text">No active sessions</span>
    </div>
  )
}

export default function App(): JSX.Element {
  const [sessions, setSessions] = useState<SessionState[]>([])

  useEffect(() => {
    window.claudePulse?.getSessions().then(setSessions)

    const unsubUpdate = window.claudePulse?.onSessionsUpdated(setSessions)
    const unsubRemove = window.claudePulse?.onSessionRemoved((id) => {
      setSessions((prev) => prev.filter((s) => s.sessionId !== id))
    })

    const timer = setInterval(() => {
      setSessions((prev) => [...prev])
    }, 1000)

    return () => {
      unsubUpdate?.()
      unsubRemove?.()
      clearInterval(timer)
    }
  }, [])

  const sorted = [...sessions].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    return b.lastActivityAt - a.lastActivityAt
  })

  return (
    <div className="hud-container">
      {sorted.length === 0 ? (
        <EmptyHUD />
      ) : (
        sorted.map((s) => <SessionCard key={s.sessionId} session={s} />)
      )}
    </div>
  )
}
