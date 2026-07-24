import type { CSSProperties } from 'react'

// iOS-inspired card: generous radius, hairline border, soft layered shadow.
export const cardStyle: CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(16,24,20,.06)',
  borderRadius: 18,
  padding: 22,
  boxShadow: '0 1px 2px rgba(16,24,20,.04), 0 12px 28px -16px rgba(16,24,20,.14)',
}

export const h3Style: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: '-.01em',
  margin: '0 0 14px',
}
