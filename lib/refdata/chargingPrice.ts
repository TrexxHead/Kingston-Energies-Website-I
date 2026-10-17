import type { RefData } from './types'

/**
 * Time-of-day charging prices (an operator's approved price record).
 * All times are Jamaica time (UTC−5, no daylight saving). A band whose end
 * is at or before its start runs past midnight (e.g. 18:00–06:00); its
 * `days` are the days it STARTS on.
 */

type Charging = RefData['charging_price']
export type PricePeriod = NonNullable<Charging['periods']>[number]

const JM_OFFSET_MIN = -5 * 60
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/** Jamaica weekday (0–6) and minute of day for an instant. */
export function jamaicaClock(at: Date): { day: number; minute: number } {
  const local = new Date(at.getTime() + JM_OFFSET_MIN * 60_000)
  return { day: local.getUTCDay(), minute: local.getUTCHours() * 60 + local.getUTCMinutes() }
}

function periodCovers(p: PricePeriod, day: number, minute: number): boolean {
  const s = toMin(p.start)
  const e = toMin(p.end)
  const startsOn = (d: number) => !p.days || p.days.length === 0 || p.days.includes(d)
  if (e > s) return startsOn(day) && minute >= s && minute < e
  // Wraps midnight: the evening part belongs to today, the early-morning part to yesterday's band.
  return (startsOn(day) && minute >= s) || (startsOn((day + 6) % 7) && minute < e)
}

export interface PriceNow {
  /** J$/kWh right now, or null when the operator doesn't publish a per-kWh price for this time. */
  pricePerKwh: number | null
  /** Band name in force ("Evening") or null for the base price. */
  label: string | null
  /** The next change within the coming 48 h. */
  next: { at: Date; pricePerKwh: number | null; label: string | null } | null
}

export function priceAt(d: Charging, at: Date): PriceNow {
  const at0 = priceOnly(d, at)
  // Step forward a minute at a time? Cheaper: check band edges in the next 48 h.
  const edges = new Set<number>()
  const base = Math.floor(at.getTime() / 60_000) * 60_000
  const { minute } = jamaicaClock(at)
  for (const p of d.periods ?? []) {
    for (const hhmm of [p.start, p.end]) {
      let delta = toMin(hhmm) - minute
      if (delta <= 0) delta += 1440
      edges.add(base + delta * 60_000)
      edges.add(base + (delta + 1440) * 60_000)
    }
  }
  let next: PriceNow['next'] = null
  for (const t of [...edges].sort((a, b) => a - b)) {
    const p = priceOnly(d, new Date(t))
    if (p.pricePerKwh !== at0.pricePerKwh || p.label !== at0.label) {
      next = { at: new Date(t), ...p }
      break
    }
  }
  return { ...at0, next }
}

function priceOnly(d: Charging, at: Date): { pricePerKwh: number | null; label: string | null } {
  const { day, minute } = jamaicaClock(at)
  const band = (d.periods ?? []).find((p) => periodCovers(p, day, minute))
  return band ? { pricePerKwh: band.pricePerKwh, label: band.label } : { pricePerKwh: d.pricePerKwh, label: null }
}

/** "6 pm" / "6:30 am" in Jamaica time. */
export function jamaicaTimeText(at: Date): string {
  return at.toLocaleTimeString('en-JM', { timeZone: 'America/Jamaica', hour: 'numeric', minute: at.getUTCMinutes() ? '2-digit' : undefined })
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const money = (n: number) => `J$${n.toLocaleString('en-JM', { maximumFractionDigits: 2 })}`
const clock = (hhmm: string) => {
  const m = toMin(hhmm)
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${((h + 11) % 12) + 1}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`
}
const daysText = (days?: number[]) => {
  if (!days?.length || days.length === 7) return ''
  const sorted = [...days].sort()
  const k = sorted.join()
  return k === '1,2,3,4,5' ? ', Mon–Fri' : k === '0,6' ? ', Sat–Sun' : `, ${sorted.map((x) => DAY[x]).join('/')}`
}

/** "Evening (6 pm–6 am, Mon–Fri)". */
export const periodText = (p: PricePeriod) => `${p.label} (${clock(p.start)}–${clock(p.end)}${daysText(p.days)})`

/** One-line summary of all bands for a card: "J$60/kWh standard · Evening (6 pm–6 am) J$120/kWh · J$100 per session". */
export function priceSummary(d: Charging): string {
  const parts: string[] = []
  if (d.pricePerKwh != null) parts.push(`${money(d.pricePerKwh)}/kWh${d.periods?.length ? ' standard' : ''}`)
  for (const p of d.periods ?? []) parts.push(`${periodText(p)} ${money(p.pricePerKwh)}/kWh`)
  if (d.sessionFee) parts.push(`${money(d.sessionFee)} per session`)
  if (d.idleFeePerMin) parts.push(`${money(d.idleFeePerMin)}/min idle${d.idleGraceMin ? ` after ${d.idleGraceMin} min` : ''}`)
  return parts.join(' · ')
}

/** Match an operator price record to a station's operator name (case- and spacing-insensitive). */
export const sameOperator = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ')

/** An operator's approved price record as attached to a station. */
export interface OperatorPrice {
  name: string
  effectiveFrom: string
  source: { title: string; url?: string | null; retrievedAt: string }
  data: Charging
}
