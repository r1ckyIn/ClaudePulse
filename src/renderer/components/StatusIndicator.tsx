import { statusColors } from '../styles/theme'

interface StatusIndicatorProps {
  status: string
  size?: number
}

export default function StatusIndicator({ status, size = 8 }: StatusIndicatorProps): JSX.Element {
  const color = statusColors[status] || statusColors.idle
  const animClass = `status-${status}`

  return (
    <span
      className={`status-dot ${animClass}`}
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  )
}
