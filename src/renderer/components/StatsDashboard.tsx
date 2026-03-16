import { useState, useEffect } from 'react'
import type { DayStats } from '../../shared/types'
import type { ClaudePulseAPI } from '../../main/preload'

declare global {
  interface Window {
    claudePulse: ClaudePulseAPI
  }
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

interface BarProps {
  value: number
  max: number
  label: string
  sublabel: string
}

function Bar({ value, max, label, sublabel }: BarProps): JSX.Element {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div className="stats-bar-row">
      <div className="stats-bar-labels">
        <span className="stats-bar-label">{label}</span>
        <span className="stats-bar-sublabel">{sublabel}</span>
      </div>
      <div className="stats-bar-track">
        <div
          className="stats-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function StatsDashboard(): JSX.Element {
  const [stats, setStats] = useState<DayStats[]>([])

  useEffect(() => {
    window.claudePulse?.getStats().then(setStats)

    const unsub = window.claudePulse?.onStatsUpdated(setStats)
    return () => unsub?.()
  }, [])

  if (stats.length === 0) {
    return (
      <div className="stats-empty">
        <p className="stats-empty-text">No statistics yet</p>
      </div>
    )
  }

  const totalSessions = stats.reduce((s, d) => s + d.sessionCount, 0)
  const totalTools = stats.reduce((s, d) => s + d.toolCalls, 0)
  const totalDuration = stats.reduce((s, d) => s + d.totalDurationMs, 0)

  // Aggregate tool breakdown across all days
  const toolBreakdown: Record<string, number> = {}
  for (const day of stats) {
    for (const [tool, count] of Object.entries(day.toolBreakdown)) {
      toolBreakdown[tool] = (toolBreakdown[tool] || 0) + count
    }
  }

  const topTools = Object.entries(toolBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const maxToolCount = topTools.length > 0 ? topTools[0][1] : 1

  // Daily chart data
  const maxDaily = Math.max(...stats.map((d) => d.toolCalls), 1)

  return (
    <div className="stats-dashboard">
      <div className="stats-summary">
        <div className="stats-metric">
          <span className="stats-metric-value">{totalSessions}</span>
          <span className="stats-metric-label">Sessions</span>
        </div>
        <div className="stats-metric">
          <span className="stats-metric-value">{totalTools}</span>
          <span className="stats-metric-label">Tool Calls</span>
        </div>
        <div className="stats-metric">
          <span className="stats-metric-value">{formatDuration(totalDuration)}</span>
          <span className="stats-metric-label">Total Time</span>
        </div>
      </div>

      {topTools.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-section-title">Top Tools (7 days)</h3>
          {topTools.map(([tool, count]) => (
            <Bar
              key={tool}
              value={count}
              max={maxToolCount}
              label={tool}
              sublabel={`${count}`}
            />
          ))}
        </div>
      )}

      <div className="stats-section">
        <h3 className="stats-section-title">Daily Activity</h3>
        {stats.map((day) => (
          <Bar
            key={day.date}
            value={day.toolCalls}
            max={maxDaily}
            label={day.date.slice(5)} // MM-DD
            sublabel={`${day.toolCalls} calls`}
          />
        ))}
      </div>
    </div>
  )
}
