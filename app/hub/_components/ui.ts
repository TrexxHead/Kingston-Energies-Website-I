import type { CSSProperties } from 'react'

/** Shared Hub surface styles so every page reads as one system. */

export const hubScreen: CSSProperties = {
  padding: 32,
  maxWidth: 1160,
}

export const hubCard: CSSProperties = {
  background: '#fff',
  border: '1px solid var(--color-border)',
  borderRadius: 16,
  padding: 24,
}

export const hubH3: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 15,
  margin: '0 0 14px',
}

export const hubEyebrow: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
  letterSpacing: '.14em',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
}
