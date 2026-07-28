'use client'

import { CHROME } from './palette'

export interface TooltipRow {
  label: string
  value: string
  color?: string
}

/**
 * The hover readout.
 *
 * The value leads and the series name follows — the legend's hierarchy
 * inverted, because by the time someone is hovering they already know which
 * series they are on and want the number. Rows key their series with a short
 * stroke rather than a filled box: at this density a block of colour is
 * data-weight ink doing a label's job.
 */
export default function Tooltip({
  x,
  y,
  title,
  rows,
  width = 200,
}: {
  x: number
  y: number
  title: string
  rows: TooltipRow[]
  width?: number
}) {
  return (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, calc(-100% - 12px))',
        minWidth: 140,
        maxWidth: width,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        boxShadow: '0 8px 24px -8px rgba(16,24,20,.28)',
        padding: '9px 11px',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: CHROME.textMuted, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              {r.color && <span style={{ width: 12, height: 2, borderRadius: 1, background: r.color, flexShrink: 0 }} />}
              <span style={{ fontSize: 11.5, color: CHROME.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: CHROME.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
