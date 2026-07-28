'use client'

import { useCallback, useRef, useState } from 'react'
import ChartFrame, { type LegendItem } from './ChartFrame'
import Tooltip from './Tooltip'
import { CHROME, MARKS, compactMoney, money, niceTicks, seriesColor } from './palette'

export interface BarSeries {
  label: string
  values: number[]
}

interface BarChartProps {
  title: string
  subtitle?: string
  categories: string[]
  series: BarSeries[]
  /** Stack the series instead of placing them side by side. */
  stacked?: boolean
  /** Lay the bars horizontally — right for long category names. */
  horizontal?: boolean
  height?: number
  format?: (n: number) => string
  onSelect?: (index: number, category: string) => void
  footnote?: React.ReactNode
  actions?: React.ReactNode
}

/**
 * Grouped or stacked bars.
 *
 * The mark itself is the hit target — no crosshair — and each bar lifts on
 * hover so the reader can see it respond. Touching marks are separated by a
 * gap in the surface colour rather than by a stroke, which would add
 * data-weight ink that isn't data.
 */
export default function BarChart({
  title,
  subtitle,
  categories,
  series,
  stacked = false,
  horizontal = false,
  height = 240,
  format = money,
  onSelect,
  footnote,
  actions,
}: BarChartProps) {
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<{ cat: number; series: number } | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const set = () => setWidth(node.clientWidth || 640)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(node)
  }, [])

  const visible = series.filter((s) => !hidden.has(s.label))
  const totals = categories.map((_, i) =>
    stacked ? visible.reduce((s, ser) => s + (ser.values[i] ?? 0), 0) : Math.max(0, ...visible.map((ser) => ser.values[i] ?? 0)),
  )
  const maxValue = Math.max(0, ...totals)
  const ticks = niceTicks(maxValue)
  const top = ticks[ticks.length - 1] || 1

  const PAD = horizontal
    ? { top: 10, right: 20, bottom: 24, left: Math.min(150, Math.max(90, ...categories.map((c) => c.length * 6.4))) }
    : { top: 14, right: 14, bottom: 28, left: 54 }

  const plotW = Math.max(60, width - PAD.left - PAD.right)
  const plotH = height - PAD.top - PAD.bottom

  const bandCount = Math.max(1, categories.length)
  const band = (horizontal ? plotH : plotW) / bandCount
  const groupCount = stacked ? 1 : Math.max(1, visible.length)
  // Bars never fill their band — the leftover is deliberate air, and the cap
  // stops a two-bar chart rendering as two slabs.
  const thickness = Math.min(MARKS.maxBarThickness, Math.max(4, (band * 0.62) / groupCount))

  const legend: LegendItem[] = series.map((s, i) => ({
    label: s.label,
    color: seriesColor(i),
    shape: 'rect',
    hidden: hidden.has(s.label),
  }))

  const table = {
    columns: [horizontal ? 'Item' : 'Period', ...series.map((s) => s.label), ...(stacked && series.length > 1 ? ['Total'] : [])],
    rows: categories.map((c, i) => [
      c,
      ...series.map((s) => format(s.values[i] ?? 0)),
      ...(stacked && series.length > 1 ? [format(series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0))] : []),
    ]),
  }

  const isEmpty = maxValue <= 0

  const scale = (v: number) => (v / top) * (horizontal ? plotW : plotH)

  const tooltipRows = hover
    ? stacked
      ? visible.map((s, si) => ({ label: s.label, value: format(s.values[hover.cat] ?? 0), color: seriesColor(series.indexOf(visible[si])) }))
      : [{ label: visible[hover.series].label, value: format(visible[hover.series].values[hover.cat] ?? 0), color: seriesColor(series.indexOf(visible[hover.series])) }]
    : []

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      legend={legend}
      onToggleSeries={(label) =>
        setHidden((prev) => {
          const next = new Set(prev)
          if (next.has(label)) next.delete(label)
          else next.add(label)
          return next.size >= series.length ? prev : next
        })
      }
      table={table}
      isEmpty={isEmpty}
      empty="Nothing recorded in this period yet."
      footnote={footnote}
      actions={actions}
    >
      <div ref={(n) => { wrapRef.current = n; measure(n) }} style={{ position: 'relative', width: '100%' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${title}. ${categories.length} categories. Switch to the table view for the figures.`}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {ticks.map((t) =>
            horizontal ? (
              <g key={t}>
                <line x1={PAD.left + scale(t)} x2={PAD.left + scale(t)} y1={PAD.top} y2={PAD.top + plotH} stroke={CHROME.grid} strokeWidth={1} />
                <text x={PAD.left + scale(t)} y={height - 8} textAnchor="middle" fontSize={10} fill={CHROME.textSubtle} fontFamily="var(--font-mono)">
                  {compactMoney(t)}
                </text>
              </g>
            ) : (
              <g key={t}>
                <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH - scale(t)} y2={PAD.top + plotH - scale(t)} stroke={CHROME.grid} strokeWidth={1} />
                <text x={PAD.left - 8} y={PAD.top + plotH - scale(t) + 3.5} textAnchor="end" fontSize={10} fill={CHROME.textSubtle} fontFamily="var(--font-mono)">
                  {compactMoney(t)}
                </text>
              </g>
            ),
          )}

          {categories.map((cat, ci) => {
            const bandStart = (horizontal ? PAD.top : PAD.left) + ci * band
            let stackOffset = 0

            return (
              <g key={`${cat}-${ci}`}>
                {horizontal && (
                  <text
                    x={PAD.left - 10}
                    y={bandStart + band / 2 + 3.5}
                    textAnchor="end"
                    fontSize={11.5}
                    fill={CHROME.textMuted}
                  >
                    {cat.length > 22 ? `${cat.slice(0, 21)}…` : cat}
                  </text>
                )}

                {visible.map((s, si) => {
                  const raw = s.values[ci] ?? 0
                  const len = scale(raw)
                  if (len <= 0) return null
                  const seriesIndex = series.indexOf(s)
                  const isHovered = hover?.cat === ci && (stacked || hover.series === si)

                  // A 2px surface gap separates touching marks — stacked
                  // segments and adjacent bars alike, one consistent width.
                  const drawn = stacked ? Math.max(0, len - MARKS.gap) : len

                  const offsetInBand = stacked
                    ? (band - thickness) / 2
                    : (band - thickness * visible.length - MARKS.gap * (visible.length - 1)) / 2 + si * (thickness + MARKS.gap)

                  const rect = horizontal
                    ? { x: PAD.left + stackOffset, y: bandStart + offsetInBand, width: drawn, height: thickness }
                    : { x: bandStart + offsetInBand, y: PAD.top + plotH - stackOffset - drawn, width: thickness, height: drawn }

                  if (stacked) stackOffset += len

                  return (
                    <g key={s.label}>
                      {/* 4px rounded data-end, square at the baseline. Drawn as a
                          rounded rect clipped back to the baseline by a second
                          square rect, which is cheaper than a hand-built path. */}
                      <rect
                        {...rect}
                        rx={Math.min(4, horizontal ? rect.height / 2 : rect.width / 2)}
                        fill={seriesColor(seriesIndex)}
                        opacity={isHovered ? 0.82 : 1}
                      />
                      {!stacked && (
                        <rect
                          x={horizontal ? PAD.left : rect.x}
                          y={horizontal ? rect.y : rect.y + rect.height - Math.min(4, rect.width / 2)}
                          width={horizontal ? Math.min(4, rect.height / 2) : rect.width}
                          height={horizontal ? rect.height : Math.min(4, rect.width / 2)}
                          fill={seriesColor(seriesIndex)}
                          opacity={isHovered ? 0.82 : 1}
                        />
                      )}
                      <rect
                        x={horizontal ? PAD.left : rect.x - 4}
                        y={horizontal ? rect.y - 4 : PAD.top}
                        width={horizontal ? plotW : rect.width + 8}
                        height={horizontal ? rect.height + 8 : plotH}
                        fill="transparent"
                        style={{ cursor: onSelect ? 'pointer' : 'default' }}
                        onPointerEnter={() => setHover({ cat: ci, series: si })}
                        onPointerLeave={() => setHover(null)}
                        onClick={() => onSelect?.(ci, cat)}
                      />
                    </g>
                  )
                })}
              </g>
            )
          })}

          {horizontal ? (
            <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + plotH} stroke={CHROME.axis} strokeWidth={1} />
          ) : (
            <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke={CHROME.axis} strokeWidth={1} />
          )}

          {!horizontal &&
            categories.map((cat, ci) => {
              const every = Math.ceil((categories.length * 52) / Math.max(plotW, 1))
              if (ci % every !== 0 && ci !== categories.length - 1) return null
              return (
                <text
                  key={`x-${cat}-${ci}`}
                  x={PAD.left + ci * band + band / 2}
                  y={height - 9}
                  textAnchor="middle"
                  fontSize={10}
                  fill={CHROME.textSubtle}
                  fontFamily="var(--font-mono)"
                >
                  {(() => {
                    const chars = Math.max(4, Math.floor(band / 6))
                    return cat.length > chars ? `${cat.slice(0, chars - 1)}…` : cat
                  })()}
                </text>
              )
            })}
        </svg>

        {/* Keyboard route to the same values the pointer reveals. */}
        <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          {categories.map((cat, ci) => (
            <button
              key={`k-${cat}-${ci}`}
              type="button"
              onFocus={() => setHover({ cat: ci, series: 0 })}
              onBlur={() => setHover(null)}
              onClick={() => onSelect?.(ci, cat)}
            >
              {`${cat}: ${series.map((s) => `${s.label} ${format(s.values[ci] ?? 0)}`).join(', ')}`}
            </button>
          ))}
        </div>

        {hover && (
          <Tooltip
            x={horizontal ? PAD.left + scale(totals[hover.cat]) / 2 : PAD.left + hover.cat * band + band / 2}
            y={horizontal ? PAD.top + hover.cat * band + band / 2 : PAD.top + plotH - scale(totals[hover.cat])}
            title={categories[hover.cat]}
            rows={tooltipRows}
          />
        )}
      </div>
    </ChartFrame>
  )
}
