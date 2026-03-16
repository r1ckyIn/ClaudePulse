import type { SessionState } from '../../shared/types'
import StatusIndicator from './StatusIndicator'

interface SessionCardProps {
  session: SessionState
}

function formatElapsed(startedAt: number): string {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000)
  if (elapsed < 60) return `${elapsed}s`
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
  return `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`
}

export default function SessionCard({ session }: SessionCardProps): JSX.Element {
  const shortId = session.sessionId.slice(0, 4)

  return (
    <div className="session-card">
      <div className="session-header">
        <StatusIndicator status={session.status} />
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
        <span className="session-terminal">{session.terminal}</span>
      </div>
    </div>
  )
}
