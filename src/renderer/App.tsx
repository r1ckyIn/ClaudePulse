import { useState, useEffect } from 'react'
import type { SessionState } from '../shared/types'
import type { ClaudePulseAPI } from '../main/preload'

declare global {
  interface Window {
    claudePulse: ClaudePulseAPI
  }
}

function formatElapsed(startedAt: number): string {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000)
  if (elapsed < 60) return `${elapsed}s`
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
  return `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`
}

function StatusDot({ status }: { status: string }): JSX.Element {
  const colors: Record<string, string> = {
    reading: '#6a9bcc',
    writing: '#d97757',
    thinking: '#d97757',
    waiting: '#d97757',
    completed: '#788c5d',
    error: '#c45d4f',
    idle: '#9a9790',
  }

  const color = colors[status] || colors.idle

  return (
    <span
      className={`status-dot status-${status}`}
      style={{ backgroundColor: color }}
    />
  )
}

function SessionCard({ session }: { session: SessionState }): JSX.Element {
  const shortId = session.sessionId.slice(0, 4)

  return (
    <div className="session-card">
      <div className="session-header">
        <StatusDot status={session.status} />
        <span className="session-project">
          {session.project}
          <span className="session-id"> #{shortId}</span>
        </span>
        <span className="session-elapsed">{formatElapsed(session.startedAt)}</span>
      </div>
      <div className="session-detail">
        <span className="session-status">{session.status}</span>
        {session.currentTool && (
          <span className="session-tool">{session.currentTool}</span>
        )}
      </div>
    </div>
  )
}

export default function App(): JSX.Element {
  const [sessions, setSessions] = useState<SessionState[]>([])

  useEffect(() => {
    // Initial fetch
    window.claudePulse?.getSessions().then(setSessions)

    // Subscribe to updates
    const unsubUpdate = window.claudePulse?.onSessionsUpdated(setSessions)
    const unsubRemove = window.claudePulse?.onSessionRemoved((id) => {
      setSessions((prev) => prev.filter((s) => s.sessionId !== id))
    })

    // Refresh elapsed time every second
    const timer = setInterval(() => {
      setSessions((prev) => [...prev])
    }, 1000)

    return () => {
      unsubUpdate?.()
      unsubRemove?.()
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="container">
      <div className="header">
        <span className="header-title">ClaudePulse</span>
        <span className="header-count">{sessions.length}</span>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No active sessions</p>
          <p className="empty-subtitle">
            Start a Claude Code instance to see it here
          </p>
        </div>
      ) : (
        <div className="session-list">
          {sessions.map((session) => (
            <SessionCard key={session.sessionId} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
