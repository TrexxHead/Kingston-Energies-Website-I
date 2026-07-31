// Products that actually carry a cell to degrade — everything else (cables,
// fixed chargers, adapters) gets a warranty/lifetime tracker instead.
const BATTERY_CATEGORIES = new Set(['POWERBANKS', 'STATIONS'])

export function hasBattery(category: string | null | undefined): boolean {
  return !!category && BATTERY_CATEGORIES.has(category)
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44
// Consumer Li-ion power banks/stations typically settle around 80% retained
// capacity after ~2 years of casual, non-fast-cycled use — this fade rate
// (~0.7%/month) lands there, with a floor matching when most people stop
// trusting the cell rather than modeling total failure.
const MONTHLY_FADE_PCT = 0.7
const FLOOR_PCT = 55

/** A small deterministic per-unit variance (±3%) so identical-age units don't all read the same number. */
function serialVariance(serial: string): number {
  let hash = 0
  for (let i = 0; i < serial.length; i++) hash = (hash * 31 + serial.charCodeAt(i)) >>> 0
  return ((hash % 100) / 100 - 0.5) * 6
}

/**
 * Estimated battery health for a serialized unit, modeled from time-in-service
 * against a realistic Li-ion fade curve — not a live sensor reading (this app
 * has no telemetry from the device itself), so it's always presented as an
 * estimate.
 */
export function estimateBatteryHealthPct(purchasedAt: Date, serial: string): number {
  const monthsOwned = Math.max(0, (Date.now() - purchasedAt.getTime()) / MS_PER_MONTH)
  const raw = 100 - monthsOwned * MONTHLY_FADE_PCT + serialVariance(serial)
  return Math.max(FLOOR_PCT, Math.min(100, Math.round(raw)))
}

export function monthsOwned(purchasedAt: Date): number {
  return Math.floor((Date.now() - purchasedAt.getTime()) / MS_PER_MONTH)
}

// Kingston Energies doesn't offer a blanket fixed-term warranty (see
// /legal/warranty) — every device gets a real 14-day replacement window plus
// whatever the manufacturer's own warranty is, which varies by brand and
// isn't something we can promise a specific length for. Never show a
// countdown implying Kingston guarantees N months of coverage.
export const RETURN_WINDOW_DAYS = 14

export function returnWindowDaysLeft(purchasedAt: Date): number {
  const daysSince = Math.floor((Date.now() - purchasedAt.getTime()) / 86400000)
  return Math.max(0, RETURN_WINDOW_DAYS - daysSince)
}
