/**
 * Chart colour, as roles rather than hexes.
 *
 * The eight categorical slots are an ORDERED set whose order is the
 * colour-blind-safety mechanism — adjacent pairs were validated for CVD
 * separation against this app's own light and dark surfaces. So series take
 * slots 1, 2, 3… in sequence and the assignment follows the entity, not its
 * rank: filtering a chart must never repaint the series that survive.
 *
 * Values live in tokens.css so light and dark swap in one place.
 */

export const SERIES_SLOTS = 8

/** Colour for the nth series (0-based). */
export function seriesColor(index: number): string {
  return `var(--viz-${(index % SERIES_SLOTS) + 1})`
}

/**
 * Fold anything past the eighth series into a single "Other".
 *
 * A ninth generated hue would be indistinguishable from one already on screen,
 * so the honest move is to stop naming them individually.
 */
export function foldSeries<T extends { label: string; value: number }>(rows: T[], max = SERIES_SLOTS): { label: string; value: number }[] {
  if (rows.length <= max) return rows.map((r) => ({ label: r.label, value: r.value }))
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  const kept = sorted.slice(0, max - 1).map((r) => ({ label: r.label, value: r.value }))
  const other = sorted.slice(max - 1).reduce((s, r) => s + r.value, 0)
  return [...kept, { label: 'Other', value: other }]
}

/** Magnitude ramp — one hue, light to dark. Never a rainbow. */
export const SEQUENTIAL = ['var(--viz-seq-1)', 'var(--viz-seq-2)', 'var(--viz-seq-3)', 'var(--viz-seq-4)', 'var(--viz-seq-5)', 'var(--viz-seq-6)']

export function sequentialColor(fraction: number): string {
  const i = Math.min(SEQUENTIAL.length - 1, Math.max(0, Math.round(fraction * (SEQUENTIAL.length - 1))))
  return SEQUENTIAL[i]
}

/**
 * Reserved status colours. Never used as a series — a status colour must not
 * impersonate a category — and always shipped with an icon or a label so the
 * meaning never rests on hue alone.
 */
export const STATUS = {
  good: 'var(--viz-good)',
  warning: 'var(--viz-warning)',
  serious: 'var(--viz-serious)',
  critical: 'var(--viz-critical)',
} as const

export const CHROME = {
  surface: 'var(--viz-surface)',
  grid: 'var(--viz-grid)',
  axis: 'var(--viz-axis)',
  text: 'var(--color-text)',
  textMuted: 'var(--color-text-muted)',
  textSubtle: 'var(--color-text-subtle)',
} as const

/** Mark specs, fixed across every chart in the console. */
export const MARKS = {
  /** Bars never fill their band — the leftover is deliberate air. */
  maxBarThickness: 24,
  /** Surface-coloured gap separating touching marks (stacked segments, adjacent bars). */
  gap: 2,
  lineWidth: 2,
  markerRadius: 4,
  /** Ring in the surface colour so markers stay legible where they overlap. */
  markerRing: 2,
  areaOpacity: 0.1,
} as const

const jmd = new Intl.NumberFormat('en-JM', { maximumFractionDigits: 0 })

/** Axis ticks and tooltips share one money format so they can't disagree. */
export function money(n: number): string {
  return `J$${jmd.format(Math.round(n))}`
}

/** Compact form for axis ticks, where full figures would collide. */
export function compactMoney(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `J$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 1_000) return `J$${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  return `J$${Math.round(n)}`
}

/**
 * Axis ticks on round numbers.
 *
 * Ticks carry the values that aren't directly labelled, so they have to read
 * as numbers a person would actually say — 2,000 rather than 1,847.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0]
  const rough = max / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude

  // The top tick must sit at or above the largest value. Stopping below it
  // scales the plot to less than its own data, and the tallest bar renders
  // outside the card.
  const ticks: number[] = []
  for (let v = 0; ; v += step) {
    ticks.push(v)
    if (v >= max) break
    // Guard against a pathological step; 40 gridlines is already unreadable.
    if (ticks.length > 40) break
  }
  return ticks
}
