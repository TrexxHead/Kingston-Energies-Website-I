'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react'
import { cardStyle } from '../ui/card'
import { CHROME } from './palette'
import Sparkline from './Sparkline'

export interface StatTileProps {
  label: string
  value: string
  /** Percentage change against the previous period. Null when there's no basis. */
  change?: number | null
  /** Whether an increase is a good thing. Drives the delta colour. */
  goodWhenUp?: boolean
  /** Trend behind the number. Direction only — the value is the number above. */
  trend?: number[]
  colorIndex?: number
  /** Where clicking the tile goes for the detail behind it. */
  href?: string
  /** One line explaining what the figure means or how it was derived. */
  hint?: string
  /** Says plainly when a figure cannot be computed yet, instead of showing zero. */
  unavailable?: string
}

/**
 * A single headline figure.
 *
 * Not every number wants a chart — a KPI's job is magnitude at a glance, and a
 * plot behind it would compete with the digits. The sparkline is direction
 * only; the number is the value, and the tile links to the screen that
 * explains it.
 */
export default function StatTile({
  label,
  value,
  change = null,
  goodWhenUp = true,
  trend,
  colorIndex = 0,
  href,
  hint,
  unavailable,
}: StatTileProps) {
  const up = (change ?? 0) > 0
  const flat = change === 0
  const good = change === null ? null : goodWhenUp ? up : !up
  // Delta colour is reinforced by the arrow, so direction never rests on hue.
  const deltaColor = good === null || flat ? CHROME.textMuted : good ? 'var(--viz-good)' : 'var(--viz-critical)'

  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 21,
              letterSpacing: '-.01em',
              color: unavailable ? CHROME.textMuted : CHROME.text,
              lineHeight: 1.15,
            }}
          >
            {unavailable ? 'N/A' : value}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '.1em',
              color: CHROME.textMuted,
              marginTop: 6,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {label}
            {hint && <HelpCircle size={11} style={{ opacity: 0.6, flexShrink: 0 }} aria-hidden />}
          </div>
        </div>
        {trend && trend.length > 1 && !unavailable && <Sparkline values={trend} colorIndex={colorIndex} />}
      </div>

      {unavailable ? (
        <div style={{ fontSize: 11.5, color: CHROME.textMuted, marginTop: 8, lineHeight: 1.45 }}>{unavailable}</div>
      ) : change !== null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: deltaColor, marginTop: 8 }}>
          {flat ? <Minus size={13} aria-hidden /> : up ? <TrendingUp size={13} aria-hidden /> : <TrendingDown size={13} aria-hidden />}
          {Math.abs(change)}% vs last month
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: CHROME.textSubtle, marginTop: 8 }}>No prior month to compare</div>
      )}
    </>
  )

  const style: React.CSSProperties = {
    ...cardStyle,
    borderRadius: 14,
    padding: 15,
    display: 'block',
    textDecoration: 'none',
    transition: 'border-color .15s ease',
  }

  return href ? (
    <Link href={href} style={style} title={hint}>
      {body}
    </Link>
  ) : (
    <div style={style} title={hint}>
      {body}
    </div>
  )
}
