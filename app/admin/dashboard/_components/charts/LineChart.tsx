'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import ChartFrame, { type LegendItem } from './ChartFrame'
import Tooltip from './Tooltip'
import { CHROME, MARKS, compactMoney, money, niceTicks, seriesColor } from './palette'

export interface Series {
  label: string
  values: (number | null)[]
  /** Draw a wash under the line. Only sensible for a single series. */
  area?: boolean
  /** Marks a projection rather than a recorded figure. */
  dashed?: boolean
}

interface LineChartProps {
  title: string
  subtitle?: string
  /** One label per x position. */
  categories: string[]
  series: Series[]
  height?: number
  format?: (n: number) => string
  /** Called when a point is chosen — the drill-down hook. */
  onSelect?: (index: number, category: string) => void
  footnote?: React.ReactNode
  actions?: React.ReactNode
}

const PAD = { top: 14, right: 16, bottom: 26, left: 54 }

/**
 * Line and area chart with a crosshair.
 *
 * The crosshair snaps to the nearest x, so the reader aims at a date rather
 * than at a 2px line, and one tooltip lists every series at that point — the
 * pointer never has to land on a particular line to get its value.
 */
export default function LineChart({
  title,
  subtitle,
  categories,
  series,
  height = 220,
  format = money,
  onSelect,
  footnote,
  actions,
}: LineChartProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<number | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const set = () => setWidth(node.clientWidth || 640)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(node)
  }, [])

  const visible = series.filter((s) => !hidden.has(s.label))
  const flat = visible.flatMap((s) => s.values).filter((v): v is number => v !== null)
  const maxValue = flat.length ? Math.max(...flat, 0) : 0
  const ticks = niceTicks(maxValue)
  const top = ticks[ticks.length - 1] || 1

  const plotW = Math.max(80, width - PAD.left - PAD.right)
  const plotH = height - PAD.top - PAD.bottom
  const stepX = categories.length > 1 ? plotW / (categories.length - 1) : 0
  const xAt = (i: number) => PAD.left + (categories.length > 1 ? i * stepX : plotW / 2)
  const yAt = (v: number) => PAD.top + plotH - (v / top) * plotH

  const paths = useMemo(
    () =>
      visible.map((s) => {
        const points = s.values.map((v, i) => (v === null ? null : { x: xAt(i), y: yAt(v) }))
        let d = ''
        let open = false
        for (const p of points) {
          if (!p) {
            open = false
            continue
          }
          d += `${open ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)} `
          open = true
        }
        return { series: s, d: d.trim(), points }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, width, height, top, categories.length],
  )

  const nearest = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect || categories.length === 0) return null
    const x = clientX - rect.left
    if (categories.length === 1) return 0
    const i = Math.round((x - PAD.left) / stepX)
    return Math.min(categories.length - 1, Math.max(0, i))
  }

  const legend: LegendItem[] = series.map((s, i) => ({
    label: s.label,
    color: seriesColor(i),
    shape: 'line',
    hidden: hidden.has(s.label),
  }))

  const table = {
    columns: ['Period', ...series.map((s) => s.label)],
    rows: categories.map((c, i) => [c, ...series.map((s) => (s.values[i] === null ? '—' : format(s.values[i] as number)))]),
  }

  const isEmpty = flat.length === 0

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
          // Never hide everything — an empty plot is worse than a full one.
          return next.size >= series.length ? prev : next
        })
      }
      table={table}
      isEmpty={isEmpty}
      empty="No figures recorded for this period yet."
      footnote={footnote}
      actions={actions}
    >
      <div
        ref={(n) => {
          wrapRef.current = n
          measure(n)
        }}
        style={{ position: 'relative', width: '100%' }}
        onPointerMove={(e) => setHover(nearest(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const i = nearest(e.clientX)
          if (i !== null && onSelect) onSelect(i, categories[i])
        }}
      >
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${title}. ${series.length} series over ${categories.length} periods. Switch to the table view for the figures.`}
          style={{ display: 'block', overflow: 'visible', cursor: onSelect ? 'pointer' : 'default' }}
        >
          {/* Gridlines: hairline, solid, one step off the surface. */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={yAt(t)} y2={yAt(t)} stroke={CHROME.grid} strokeWidth={1} />
              <text x={PAD.left - 8} y={yAt(t) + 3.5} textAnchor="end" fontSize={10} fill={CHROME.textSubtle} fontFamily="var(--font-mono)">
                {compactMoney(t)}
              </text>
            </g>
          ))}

          {/* Area washes sit under every line. */}
          {paths.map(({ series: s, points }, si) => {
            if (!s.area) return null
            const pts = points.filter((p): p is { x: number; y: number } => p !== null)
            if (pts.length < 2) return null
            const base = PAD.top + plotH
            const d = `M${pts[0].x} ${base} ` + pts.map((p) => `L${p.x} ${p.y}`).join(' ') + ` L${pts[pts.length - 1].x} ${base} Z`
            return <path key={`a-${s.label}`} d={d} fill={seriesColor(series.indexOf(s))} opacity={MARKS.areaOpacity} />
          })}

          {paths.map(({ series: s, d }) => (
            <path
              key={s.label}
              d={d}
              fill="none"
              stroke={seriesColor(series.indexOf(s))}
              strokeWidth={MARKS.lineWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? '5 4' : undefined}
            />
          ))}

          {/* Crosshair. */}
          {hover !== null && (
            <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke={CHROME.axis} strokeWidth={1} />
          )}

          {/* End markers, and every point on the hovered x. Each carries a ring
              in the surface colour so it stays legible where lines cross. */}
          {paths.map(({ series: s, points }) => {
            const si = series.indexOf(s)
            const lastIndex = points.reduce((acc, p, i) => (p ? i : acc), -1)
            const show = new Set<number>()
            if (lastIndex >= 0) show.add(lastIndex)
            if (hover !== null) show.add(hover)
            return [...show].map((i) => {
              const p = points[i]
              if (!p) return null
              return (
                <circle
                  key={`${s.label}-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={MARKS.markerRadius}
                  fill={seriesColor(si)}
                  stroke={CHROME.surface}
                  strokeWidth={MARKS.markerRing}
                />
              )
            })
          })}

          <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke={CHROME.axis} strokeWidth={1} />

          {categories.map((c, i) => {
            // Thin the x labels rather than let them collide.
            const every = Math.ceil((categories.length * 46) / Math.max(plotW, 1))
            if (i % every !== 0 && i !== categories.length - 1) return null
            return (
              <text
                key={c + i}
                x={xAt(i)}
                y={height - 8}
                textAnchor={i === 0 ? 'start' : i === categories.length - 1 ? 'end' : 'middle'}
                fontSize={10}
                fill={CHROME.textSubtle}
                fontFamily="var(--font-mono)"
              >
                {c}
              </text>
            )
          })}
        </svg>

        {/* Keyboard route to the same readout the pointer gets. */}
        <div style={{ display: 'flex', position: 'absolute', inset: `${PAD.top}px ${PAD.right}px ${PAD.bottom}px ${PAD.left}px` }}>
          {categories.map((c, i) => (
            <button
              key={`hit-${c}-${i}`}
              type="button"
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => onSelect?.(i, c)}
              aria-label={`${c}: ${series.map((s) => `${s.label} ${s.values[i] === null ? 'no data' : format(s.values[i] as number)}`).join(', ')}`}
              style={{ flex: 1, background: 'none', border: 'none', padding: 0, cursor: onSelect ? 'pointer' : 'default' }}
            />
          ))}
        </div>

        {hover !== null && (
          <Tooltip
            x={xAt(hover)}
            y={Math.min(...visible.map((s) => (s.values[hover] === null ? Infinity : yAt(s.values[hover] as number))).filter(Number.isFinite), PAD.top + plotH)}
            title={categories[hover]}
            rows={visible.map((s) => ({
              label: s.label,
              value: s.values[hover] === null ? '—' : format(s.values[hover] as number),
              color: seriesColor(series.indexOf(s)),
            }))}
          />
        )}
      </div>
    </ChartFrame>
  )
}
