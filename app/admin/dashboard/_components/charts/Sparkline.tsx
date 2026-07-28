'use client'

import { MARKS, seriesColor } from './palette'

/**
 * The shape of a trend, inside a KPI tile.
 *
 * No axes, no tooltip — it carries direction, not values. The tile's own number
 * is the value, and the chart it links to carries the detail, so this never
 * becomes the only place a figure appears.
 */
export default function Sparkline({
  values,
  width = 96,
  height = 28,
  colorIndex = 0,
  ariaLabel,
}: {
  values: number[]
  width?: number
  height?: number
  colorIndex?: number
  ariaLabel?: string
}) {
  const clean = values.filter((v) => Number.isFinite(v))
  if (clean.length < 2) return null

  const max = Math.max(...clean)
  const min = Math.min(...clean, 0)
  const span = max - min || 1
  const stepX = width / (clean.length - 1)
  const points = clean.map((v, i) => ({ x: i * stepX, y: height - 3 - ((v - min) / span) * (height - 6) }))
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden={!ariaLabel} role={ariaLabel ? 'img' : undefined} aria-label={ariaLabel} style={{ display: 'block', overflow: 'visible' }}>
      <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={seriesColor(colorIndex)} opacity={MARKS.areaOpacity} />
      <path d={d} fill="none" stroke={seriesColor(colorIndex)} strokeWidth={MARKS.lineWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={3} fill={seriesColor(colorIndex)} stroke="var(--viz-surface)" strokeWidth={MARKS.markerRing} />
    </svg>
  )
}
