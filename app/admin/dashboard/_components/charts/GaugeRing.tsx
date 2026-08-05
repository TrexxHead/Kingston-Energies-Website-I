'use client'

import { CHROME, STATUS } from './palette'

export interface GaugeRingProps {
  /** 0–100. Values outside that range are clamped — a gauge reads a ratio, not raw magnitude. */
  value: number
  /** The number shown at the centre — usually a formatted % or ratio, distinct from `value` when the two scales differ. */
  centreValue: string
  /** A status word, e.g. "Normal" / "Watch" / "Tight" — colour never carries this meaning alone. */
  statusLabel: string
  tone?: 'good' | 'warning' | 'critical'
  size?: number
  /** Render for the dark hero card — swaps text ink and the track colour for legibility on `--gradient-hero`. */
  onDark?: boolean
}

/**
 * A single glanceable ratio, as a partial ring — the "how healthy is this
 * right now" read, distinct from a donut's "how is this composed."
 *
 * Reserved for one figure per screen. Status colour (good/warning/critical)
 * is reserved separately from the categorical chart palette and always ships
 * with the word next to it, never alone.
 */
export default function GaugeRing({ value, centreValue, statusLabel, tone = 'good', size = 132, onDark = false }: GaugeRingProps) {
  const pct = Math.max(0, Math.min(100, value))
  const stroke = size * 0.13
  const r = size / 2 - stroke / 2 - 1
  const circumference = 2 * Math.PI * r
  // A 270° sweep (like the FinBank/Nikitin reference) reads better than a full
  // circle for a ratio — the gap at the bottom implies "room on the dial."
  const sweep = 0.75
  const trackColor = onDark ? 'rgba(255,255,255,.14)' : CHROME.grid
  const ringColor = STATUS[tone]
  const textColor = onDark ? 'var(--color-text-on-ink)' : CHROME.text
  const mutedColor = onDark ? 'var(--ke-dark-text-muted)' : CHROME.textMuted

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} role="img" aria-label={`${centreValue}, ${statusLabel}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * sweep} ${circumference}`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * circumference * sweep} ${circumference}`}
            style={{ transition: 'stroke-dasharray .5s var(--ease-out, ease)' }}
          />
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size * 0.17, color: textColor, lineHeight: 1 }}>{centreValue}</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: onDark ? mutedColor : ringColor,
            opacity: onDark ? 0.75 : 1,
          }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  )
}
