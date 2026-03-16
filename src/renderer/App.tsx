import { useState, useEffect } from 'react'
import type { SessionState } from '../shared/types'
import type { ClaudePulseAPI } from '../main/preload'
import SessionList from './components/SessionList'
import EmptyState from './components/EmptyState'
import StatsDashboard from './components/StatsDashboard'

declare global {
  interface Window {
    claudePulse: ClaudePulseAPI
  }
}

type View = 'sessions' | 'stats'

export default function App(): JSX.Element {
  const [sessions, setSessions] = useState<SessionState[]>([])
  const [view, setView] = useState<View>('sessions')

  useEffect(() => {
    window.claudePulse?.getSessions().then(setSessions)

    const unsubUpdate = window.claudePulse?.onSessionsUpdated(setSessions)
    const unsubRemove = window.claudePulse?.onSessionRemoved((id) => {
      setSessions((prev) => prev.filter((s) => s.sessionId !== id))
    })

    // Refresh elapsed time display every second
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
        <div className="header-right">
          <button
            className={`tab-btn ${view === 'sessions' ? 'tab-active' : ''}`}
            onClick={() => setView('sessions')}
          >
            Sessions
          </button>
          <button
            className={`tab-btn ${view === 'stats' ? 'tab-active' : ''}`}
            onClick={() => setView('stats')}
          >
            Stats
          </button>
          {view === 'sessions' && (
            <span className="header-count">{sessions.length}</span>
          )}
        </div>
      </div>

      {view === 'sessions' ? (
        sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <SessionList sessions={sessions} />
        )
      ) : (
        <StatsDashboard />
      )}
    </div>
  )
}
