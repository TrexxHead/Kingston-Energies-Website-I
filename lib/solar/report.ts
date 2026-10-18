/**
 * A solar estimate as a portable snapshot: for the printable report (carried
 * in the page's URL fragment — never sent to a server) and the copies saved
 * on this device for My Energy.
 */
export interface SolarSnapshot {
  v: 1
  date: string
  engine: string
  place: { parish: string | null; lat: number; lng: number }
  roof: { type: string; areaM2: number; source: 'map_footprint' | 'drawn'; ring: [number, number][] }
  system: { modules: number; kwp: number; tiltDeg: number; facing: string; lossPct: number }
  production: { low: number; base: number; high: number; monthly: number[]; source: string } | null
  usage: { monthlyKwh: number; daytimePct: number; evKwh: number | null } | null
  savings: { daytime: number; upper: number; tariff: string } | null
  battery: { kwh: number; daytime: number | null; upper: number | null } | null
  price: { low: number; high: number; paybackLow: number | null; paybackHigh: number | null; source: string } | null
  batteryPrice: { low: number; high: number; paybackLow?: number | null; paybackHigh?: number | null } | null
  assumptions: string[]
}

export const SOLAR_SAVED_KEY = 'ke-solar-estimates-v1'

export function encodeSnapshot(s: SolarSnapshot): string {
  const json = JSON.stringify(s)
  const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, 'utf8').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSnapshot(code: string): SolarSnapshot | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
    const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString('utf8')
    const s = JSON.parse(json)
    return s && s.v === 1 && s.system && s.place ? (s as SolarSnapshot) : null
  } catch {
    return null
  }
}

/** Keep the roof outline small enough for a link: at most `max` points, 6 decimals. */
export function simplifyRing(ring: [number, number][], max = 40): [number, number][] {
  const step = Math.max(1, Math.ceil(ring.length / max))
  const out = ring.filter((_, i) => i % step === 0).map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6] as [number, number])
  return out
}

export function loadSavedEstimates(): SolarSnapshot[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SOLAR_SAVED_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((x) => x?.v === 1) : []
  } catch {
    return []
  }
}

export function saveEstimate(s: SolarSnapshot): SolarSnapshot[] {
  const list = [s, ...loadSavedEstimates()].slice(0, 5)
  try {
    localStorage.setItem(SOLAR_SAVED_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable */
  }
  return list
}
