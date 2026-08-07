import type { CSSProperties } from 'react'

// Premium card: generous radius, hairline border, soft layered shadow —
// tokenized so both border and shadow flip correctly in dark mode.
export const cardStyle: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 22,
  padding: 22,
  boxShadow: 'var(--shadow-card)',
}

/**
 * The dark "wallet card" hero variant — for one headline figure per screen
 * (a balance, a top-line KPI), never for routine content. Text inside must
 * use the `--color-text-on-ink`/inverse tokens, not the ordinary `--color-*`
 * text tokens, since this card stays dark regardless of site theme.
 */
export const cardStyleHero: CSSProperties = {
  background: 'var(--gradient-hero)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 22,
  padding: 24,
  boxShadow: 'var(--shadow-hero)',
  color: 'var(--color-text-on-ink)',
}

export const h3Style: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: '-.01em',
  margin: '0 0 14px',
}
