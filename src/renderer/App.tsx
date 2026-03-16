import { useState, useEffect } from 'react'
import type { SessionState } from '../shared/types'
import type { ClaudePulseAPI } from '../main/preload'
import SessionList from './components/SessionList'
import EmptyState from './components/EmptyState'
import StatsDashboard from './components/StatsDashboard'
import SettingsView from './components/SettingsView'

declare global {
  interface Window {
    claudePulse: ClaudePulseAPI
  }
}

type View = 'sessions' | 'stats' | 'settings'

function FloatingBallView({ sessions, onClick }: { sessions: SessionState[]; onClick: () => void }): JSX.Element {
  const activeCount = sessions.length
  const hasWaiting = sessions.some((s) => s.status === 'waiting')
  const hasActive = sessions.some((s) =>
    ['reading', 'writing', 'thinking'].includes(s.status)
  )

  // Determine ball color based on state
  let ballClass = 'ball-idle'
  if (hasWaiting) ballClass = 'ball-waiting'
  else if (hasActive) ballClass = 'ball-active'
  else if (activeCount > 0) ballClass = 'ball-has-sessions'

  return (
    <div className={`floating-ball ${ballClass}`} onClick={onClick}>
      <div className="ball-face">
        {activeCount === 0 ? (
          // Sleeping face when idle
          <span className="ball-emoji">&#x1F4A4;</span>
        ) : hasWaiting ? (
          // Eyes with exclamation when waiting for input
          <span className="ball-emoji">&#x2757;</span>
        ) : (
          // Active count
          <span className="ball-count">{activeCount}</span>
        )}
      </div>
      {activeCount > 0 && <div className="ball-ring" />}
    </div>
  )
}

export default function App(): JSX.Element {
  const [sessions, setSessions] = useState<SessionState[]>([])
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState<View>('sessions')

  useEffect(() => {
    window.claudePulse?.getSessions().then(setSessions)

    const unsubUpdate = window.claudePulse?.onSessionsUpdated(setSessions)
    const unsubRemove = window.claudePulse?.onSessionRemoved((id) => {
      setSessions((prev) => prev.filter((s) => s.sessionId !== id))
    })
    const unsubExpanded = window.claudePulse?.onExpandedChanged(setExpanded)

    const timer = setInterval(() => {
      setSessions((prev) => [...prev])
    }, 1000)

    return () => {
      unsubUpdate?.()
      unsubRemove?.()
      unsubExpanded?.()
      clearInterval(timer)
    }
  }, [])

  const handleBallClick = (): void => {
    window.claudePulse?.toggleFloating()
  }

  if (!expanded) {
    return <FloatingBallView sessions={sessions} onClick={handleBallClick} />
  }

  return (
    <div className="expanded-panel">
      <div className="panel-header">
        <button className="collapse-btn" onClick={handleBallClick}>
          &#x25C0;
        </button>
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
          <button
            className={`tab-btn ${view === 'settings' ? 'tab-active' : ''}`}
            onClick={() => setView('settings')}
          >
            &#9881;
          </button>
          {view === 'sessions' && (
            <span className="header-count">{sessions.length}</span>
          )}
        </div>
      </div>

      <div className="panel-content">
        {view === 'sessions' ? (
          sessions.length === 0 ? (
            <EmptyState />
          ) : (
            <SessionList sessions={sessions} />
          )
        ) : view === 'stats' ? (
          <StatsDashboard />
        ) : (
          <SettingsView />
        )}
      </div>
    </div>
  )
}
