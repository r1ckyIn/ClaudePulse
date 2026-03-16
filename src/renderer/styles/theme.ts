// Anthropic Design System tokens from frontend_brief.md

export const colors = {
  bg: {
    primary: '#faf9f5',     // Cream — main background
    card: '#f5f3ee',        // Slightly darker cream for cards
    cardHover: '#f0eeea',   // Card hover state
    dark: '#141413',        // Deep near-black
    accent: 'rgba(217, 119, 87, 0.08)', // Orange tint background
    accentStrong: 'rgba(217, 119, 87, 0.15)',
  },
  text: {
    primary: '#141413',
    secondary: '#6b6966',
    muted: '#9a9790',
    inverse: '#faf9f5',
  },
  accent: {
    orange: '#d97757',      // Primary accent — highlights, active states
    blue: '#6a9bcc',        // Info, links, reading
    green: '#788c5d',       // Success, completed
    red: '#c45d4f',         // Error states
    yellow: '#c4a24d',      // Warning, waiting
  },
  border: '#e5e2dc',
  shadow: {
    card: '0 2px 8px rgba(20, 20, 19, 0.06)',
    cardHover: '0 4px 12px rgba(20, 20, 19, 0.1)',
    popover: '0 8px 24px rgba(20, 20, 19, 0.12)',
  },
} as const

export const radius = {
  card: '14px',
  button: '8px',
  badge: '6px',
  dot: '50%',
} as const

export const font = {
  mono: "'SF Mono', 'Menlo', 'JetBrains Mono', monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
} as const

// Status → color mapping
export const statusColors: Record<string, string> = {
  reading: colors.accent.blue,
  writing: colors.accent.orange,
  thinking: colors.accent.orange,
  waiting: colors.accent.yellow,
  completed: colors.accent.green,
  error: colors.accent.red,
  idle: colors.text.muted,
}
