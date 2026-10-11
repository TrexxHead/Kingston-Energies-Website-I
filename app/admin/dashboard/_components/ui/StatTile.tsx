'use client'

import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  /** ReactNode so a loading skeleton can stand in for the value. */
  value: ReactNode
  sub?: string
  /** Color for the sub line — green for a positive callout, muted for a neutral hint. Defaults to muted. */
  subTone?: string
}

/**
 * A number + label (+ optional sub-line), the shared shape behind every KPI
 * tile in the dashboard. Deliberately has no card/border of its own — some
 * call sites group several tiles inside one shared card (Customers), others
 * give each its own card in a grid (Executive, Quotations) — so the wrapper
 * stays the caller's layout decision, and only the typography is shared.
 */
export default function StatTile({ label, value, sub, subTone = 'var(--color-text-subtle)' }: StatTileProps) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.01em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: 5 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: subTone, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
