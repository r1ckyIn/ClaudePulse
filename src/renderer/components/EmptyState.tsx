export default function EmptyState(): JSX.Element {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="12" stroke="#e5e2dc" strokeWidth="2" />
          <circle cx="16" cy="16" r="4" fill="#d97757" opacity="0.3">
            <animate
              attributeName="r"
              values="3;6;3"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.3;0.1;0.3"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="16" cy="16" r="2" fill="#d97757" opacity="0.6" />
        </svg>
      </div>
      <p className="empty-title">No active sessions</p>
      <p className="empty-subtitle">
        Start a Claude Code instance to see it here
      </p>
    </div>
  )
}
