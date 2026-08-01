'use client'

import { useState } from 'react'
import ChartFrame from './ChartFrame'
import { CHROME, MARKS, money, seriesColor } from './palette'

export interface Slice {
  label: string
  value: number
}

/**
 * Composition, as a donut.
 *
 * Reserved for showing a few parts of one whole — past about six slices the
 * arcs stop being comparable, so callers fold the tail into "Other" before
 * getting here. The centre carries the total, which is the number a donut is
 * actually good at.
 */
export default function DonutChart({
  title,
  subtitle,
  slices,
  size = 190,
  format = money,
  centreLabel = 'Total',
  onSelect,
  footnote,
}: {
  title: string
  subtitle?: string
  slices: Slice[]
  size?: number
  format?: (n: number) => string
  centreLabel?: string
  onSelect?: (label: string) => void
  footnote?: React.ReactNode
}) {
  const [hover, setHover] = useState<number | null>(null)

  const total = slices.reduce((s, x) => s + x.value, 0)
  const table = {
    columns: ['Category', 'Amount', 'Share'],
    rows: slices.map((s) => [s.label, format(s.value), total > 0 ? `${((s.value / total) * 100).toFixed(1)}%` : 'N/A']),
  }

  const r = size / 2
  const stroke = size * 0.17
  const radius = r - stroke / 2 - 2
  const circumference = 2 * Math.PI * radius
  // A 2px gap in the surface colour separates touching arcs.
  const gapFraction = total > 0 && slices.length > 1 ? MARKS.gap / circumference : 0

  let offset = 0
  const arcs = slices.map((s, i) => {
    const fraction = total > 0 ? s.value / total : 0
    const arc = { fraction, offset, index: i }
    offset += fraction
    return arc
  })

  const active = hover !== null ? slices[hover] : null

  // No legend box: the labelled rows beside the donut already carry identity,
  // and a second swatch list above them would just restate the same six names.
  return (
    <ChartFrame title={title} subtitle={subtitle} table={table} isEmpty={total <= 0} empty="Nothing recorded in this period yet." footnote={footnote}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${title}. Switch to the table view for the figures.`} style={{ flexShrink: 0 }}>
          <g transform={`rotate(-90 ${r} ${r})`}>
            {arcs.map((a) => {
              const visible = Math.max(0, a.fraction - gapFraction)
              if (visible <= 0) return null
              return (
                <circle
                  key={slices[a.index].label}
                  cx={r}
                  cy={r}
                  r={radius}
                  fill="none"
                  stroke={seriesColor(a.index)}
                  strokeWidth={hover === a.index ? stroke + 4 : stroke}
                  strokeDasharray={`${visible * circumference} ${circumference}`}
                  strokeDashoffset={-a.offset * circumference}
                  style={{ cursor: onSelect ? 'pointer' : 'default', transition: 'stroke-width .12s ease' }}
                  onPointerEnter={() => setHover(a.index)}
                  onPointerLeave={() => setHover(null)}
                  onClick={() => onSelect?.(slices[a.index].label)}
                />
              )
            })}
          </g>
          {/* Text wears text ink, never the slice colour. */}
          <text x={r} y={r - 4} textAnchor="middle" fontSize={17} fontWeight={800} fill={CHROME.text} fontFamily="var(--font-display)">
            {format(active ? active.value : total)}
          </text>
          <text x={r} y={r + 14} textAnchor="middle" fontSize={10} fill={CHROME.textMuted} fontFamily="var(--font-mono)" letterSpacing=".08em">
            {active ? (active.label.length > 16 ? `${active.label.slice(0, 15)}…` : active.label.toUpperCase()) : centreLabel.toUpperCase()}
          </text>
        </svg>

        {/* Direct labels, so no value is reachable only by hovering. */}
        <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {slices.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onClick={() => onSelect?.(s.label)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                background: hover === i ? 'var(--color-surface-sunk)' : 'none',
                border: 'none',
                borderRadius: 8,
                padding: '4px 6px',
                cursor: onSelect ? 'pointer' : 'default',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 3, background: seriesColor(i), flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, color: CHROME.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: CHROME.text, fontVariantNumeric: 'tabular-nums' }}>{format(s.value)}</span>
              <span style={{ fontSize: 11, color: CHROME.textSubtle, fontVariantNumeric: 'tabular-nums', width: 42, textAlign: 'right' }}>
                {total > 0 ? `${((s.value / total) * 100).toFixed(0)}%` : 'N/A'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </ChartFrame>
  )
}
