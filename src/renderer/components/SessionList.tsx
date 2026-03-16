import type { SessionState } from '../../shared/types'
import SessionCard from './SessionCard'

interface SessionListProps {
  sessions: SessionState[]
}

export default function SessionList({ sessions }: SessionListProps): JSX.Element {
  // Group sessions by project for visual grouping
  const sorted = [...sessions].sort((a, b) => {
    // Active sessions first, then by last activity
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    return b.lastActivityAt - a.lastActivityAt
  })

  return (
    <div className="session-list">
      {sorted.map((session) => (
        <SessionCard key={session.sessionId} session={session} />
      ))}
    </div>
  )
}
