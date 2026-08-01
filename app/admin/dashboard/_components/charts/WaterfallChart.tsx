'use client'

import { useCallback, useRef, useState } from 'react'
import ChartFrame from './ChartFrame'
import Tooltip from './Tooltip'
import { CHROME, MARKS, compactMoney, money, niceTicks } from './palette'

export interface WaterfallStep {
  label: string
  /** Signed: positive adds, negative subtracts. */
  value: number
  /** A running total rather than a movement — drawn from the baseline. */
  total?: boolean
}

/**
 * How you got from revenue to profit, one step at a time.
 *
 * Direction is polarity, not identity, so this uses the diverging pair —
 * additions in one hue, subtractions in the other, subtotals in neutral ink —
 * rather than categorical slots. A category colour here would imply the steps
 * are peers, and they aren't.
 */
export default function WaterfallChart({
  title,
  subtitle,
  steps,
  height = 260,
  format = money,
  footnote,
}: {
  title: string
  subtitle?: string
  steps: WaterfallStep[]
  height?: number
  format?: (n: number) => string
  footnote?: React.ReactNode
}) {
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const set = () => setWidth(node.clientWidth || 640)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(node)
  }, [])

  // Walk the steps to find where each bar starts and ends.
  let running = 0
  const bars = steps.map((s) => {
    if (s.total) {
      const bar = { ...s, from: 0, to: running }
      return bar
    }
    const from = running
    running += s.value
    return { ...s, from, to: running }
  })

  const values = bars.flatMap((b) => [b.from, b.to])
  const maxValue = Math.max(0, ...values)
  const minValue = Math.min(0, ...values)
  const ticks = niceTicks(maxValue)
  const top = ticks[ticks.length - 1] || 1
  const bottom = Math.min(0, minValue)

  const PAD = { top: 14, right: 14, bottom: 34, left: 56 }
  const plotW = Math.max(60, width - PAD.left - PAD.right)
  const plotH = height - PAD.top - PAD.bottom
  const span = top - bottom || 1
  const yAt = (v: number) => PAD.top + plotH - ((v - bottom) / span) * plotH

  const band = plotW / Math.max(1, bars.length)
  const thickness = Math.min(MARKS.maxBarThickness, Math.max(6, band * 0.56))
  // Fit the label to the band it has rather than to a fixed character count —
  // a wide chart shouldn't truncate "Gross profit" for no reason.
  const labelChars = Math.max(6, Math.floor(band / 6))

  const colorFor = (b: (typeof bars)[number]) => (b.total ? CHROME.axis : b.value >= 0 ? 'var(--viz-1)' : 'var(--viz-8)')

  const table = {
    columns: ['Step', 'Movement', 'Running total'],
    rows: bars.map((b) => [b.label, b.total ? 'N/A' : format(b.value), format(b.to)]),
  }

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      table={table}
      isEmpty={bars.length === 0 || (maxValue === 0 && minValue === 0)}
      empty="Not enough activity to build a bridge yet."
      footnote={footnote}
    >
      <div ref={(n) => { wrapRef.current = n; measure(n) }} style={{ position: 'relative', width: '100%' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. Switch to the table view for the figures.`} style={{ display: 'block', overflow: 'visible' }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={yAt(t)} y2={yAt(t)} stroke={CHROME.grid} strokeWidth={1} />
              <text x={PAD.left - 8} y={yAt(t) + 3.5} textAnchor="end" fontSize={10} fill={CHROME.textSubtle} fontFamily="var(--font-mono)">
                {compactMoney(t)}
              </text>
            </g>
          ))}

          {bars.map((b, i) => {
            const x = PAD.left + i * band + (band - thickness) / 2
            const yTop = yAt(Math.max(b.from, b.to))
            const yBottom = yAt(Math.min(b.from, b.to))
            const h = Math.max(2, yBottom - yTop)
            return (
              <g key={`${b.label}-${i}`}>
                {/* Connector to the next step, so the eye follows the walk. */}
                {i < bars.length - 1 && !bars[i + 1].total && (
                  <line
                    x1={x + thickness}
                    x2={PAD.left + (i + 1) * band + (band - thickness) / 2}
                    y1={yAt(b.to)}
                    y2={yAt(b.to)}
                    stroke={CHROME.grid}
                    strokeWidth={1}
                  />
                )}
                <rect x={x} y={yTop} width={thickness} height={h} rx={Math.min(4, thickness / 2)} fill={colorFor(b)} opacity={hover === i ? 0.82 : 1} />
                <rect
                  x={PAD.left + i * band}
                  y={PAD.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                />
                <text x={x + thickness / 2} y={height - 20} textAnchor="middle" fontSize={10} fill={CHROME.textSubtle} fontFamily="var(--font-mono)">
                  {b.label.length > labelChars ? `${b.label.slice(0, labelChars - 1)}…` : b.label}
                </text>
              </g>
            )
          })}

          <line x1={PAD.left} x2={PAD.left + plotW} y1={yAt(0)} y2={yAt(0)} stroke={CHROME.axis} strokeWidth={1} />
        </svg>

        {/* Direction is stated in words as well as hue — never colour alone. */}
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11.5, color: CHROME.textMuted, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--viz-1)' }} /> Adds
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--viz-8)' }} /> Subtracts
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: CHROME.axis }} /> Subtotal
          </span>
        </div>

        {hover !== null && (
          <Tooltip
            x={PAD.left + hover * band + band / 2}
            y={yAt(Math.max(bars[hover].from, bars[hover].to))}
            title={bars[hover].label}
            rows={
              bars[hover].total
                ? [{ label: 'Running total', value: format(bars[hover].to) }]
                : [
                    { label: bars[hover].value >= 0 ? 'Adds' : 'Subtracts', value: format(Math.abs(bars[hover].value)) },
                    { label: 'Running total', value: format(bars[hover].to) },
                  ]
            }
          />
        )}
      </div>
    </ChartFrame>
  )
}
