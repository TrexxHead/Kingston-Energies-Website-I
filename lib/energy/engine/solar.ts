import { type CalcResult, type Assumption, refuse, isPositive, isNonNegative } from './result'
import { type TariffVersion, marginalSaving } from './tariff'

/**
 * Rooftop solar estimate (roadmap P1).
 *
 * Inputs come from three places, each labelled:
 *  - the roof outline (OpenStreetMap/Overture building footprint, or drawn
 *    by the visitor) → measured area;
 *  - PVGIS (EU JRC) → specific yield in kWh per kWp for that spot, tilt and
 *    direction, with its year-to-year variability;
 *  - stated assumptions the visitor can change (usable share of the roof,
 *    module size and wattage, system losses).
 * Savings need an APPROVED tariff and the visitor's own usage; without them
 * the engine reports production only.
 */

export type RoofType = 'flat' | 'pitched'

/** Default assumptions — shown to the visitor and editable. */
export const SOLAR_DEFAULTS = {
  /** Share of a flat roof usable after edge setbacks, tanks, AC units and row spacing. */
  usableFractionFlat: 0.45,
  /** Share of a pitched roof's footprint on faces that suit panels. */
  usableFractionPitched: 0.4,
  /** A common residential module (~1.95 m², ~430 W). */
  moduleAreaM2: 1.95,
  moduleWatts: 430,
  /** PVGIS's default system loss (cabling, inverter, soiling, mismatch). */
  systemLossPct: 14,
  /** Low tilt for flat-roof racking (sheds rain and dust). */
  flatTiltDeg: 10,
  pitchedTiltDeg: 20,
} as const

/** Area of a lng/lat ring in m² (local equirectangular projection — accurate for roof-sized shapes). */
export function ringAreaM2(ring: [number, number][]): number {
  if (ring.length < 3) return 0
  const R = 6_371_008.8
  const lat0 = (ring.reduce((a, p) => a + p[1], 0) / ring.length) * (Math.PI / 180)
  const pts = ring.map(([lng, lat]) => [R * (lng * Math.PI) / 180 * Math.cos(lat0), (R * lat * Math.PI) / 180])
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    s += x1 * y2 - x2 * y1
  }
  return Math.abs(s) / 2
}

/** Polygon (outer ring minus holes) or MultiPolygon area in m². */
export function footprintAreaM2(geometry: { type: string; coordinates: unknown }): number {
  const poly = (rings: [number, number][][]) => rings.reduce((a, r, i) => a + (i === 0 ? ringAreaM2(r) : -ringAreaM2(r)), 0)
  if (geometry.type === 'Polygon') return Math.max(0, poly(geometry.coordinates as [number, number][][]))
  if (geometry.type === 'MultiPolygon') return Math.max(0, (geometry.coordinates as [number, number][][][]).reduce((a, p) => a + poly(p), 0))
  return 0
}

export interface RoofInput {
  footprintM2: number
  roofType: RoofType
  usableFraction?: number
  moduleAreaM2?: number
  moduleWatts?: number
}

export interface RoofSizing {
  usableM2: number
  modules: number
  kwp: number
}

export function sizeRoof(r: RoofInput): CalcResult<RoofSizing> {
  if (!isPositive(r.footprintM2)) return refuse('missing_input', ['footprintM2'], 'Choose a roof on the map or draw its outline.')
  if (r.footprintM2 > 50_000) return refuse('invalid_input', ['footprintM2'], 'That outline is larger than any single roof — redraw it around one building.')
  const fraction = r.usableFraction ?? (r.roofType === 'flat' ? SOLAR_DEFAULTS.usableFractionFlat : SOLAR_DEFAULTS.usableFractionPitched)
  if (!(fraction > 0 && fraction <= 1)) return refuse('invalid_input', ['usableFraction'], 'Usable share must be between 1% and 100%.')
  const area = r.moduleAreaM2 ?? SOLAR_DEFAULTS.moduleAreaM2
  const watts = r.moduleWatts ?? SOLAR_DEFAULTS.moduleWatts
  if (!isPositive(area) || area > 4) return refuse('invalid_input', ['moduleAreaM2'], 'Module area should be about 1.5–3 m².')
  if (!isPositive(watts) || watts > 1000) return refuse('invalid_input', ['moduleWatts'], 'Module wattage should be about 300–700 W.')
  const usable = r.footprintM2 * fraction
  const modules = Math.floor(usable / area)
  const assumptions: Assumption[] = [
    { id: 'solar.usable_fraction', description: `${Math.round(fraction * 100)}% of the ${r.roofType} roof is usable for panels.`, value: fraction },
    { id: 'solar.module', description: `Modules of ${area} m² and ${watts} W.`, value: watts, unit: 'W' },
  ]
  if (modules < 1) return refuse('invalid_input', ['footprintM2'], 'The usable area is too small for even one panel.')
  return { ok: true, value: { usableM2: usable, modules, kwp: (modules * watts) / 1000 }, basis: 'assumed', assumptions, warnings: [] }
}

/** Specific yield for 1 kWp from PVGIS. */
export interface SpecificYield {
  /** kWh per kWp per year. */
  annual: number
  /** Year-to-year standard deviation of annual output (kWh per kWp). */
  annualSd: number | null
  /** kWh per kWp for Jan..Dec. */
  monthly: number[]
  tiltDeg: number
  aspectDeg: number
  lossPct: number
  source: string
}

export interface ProductionEstimate {
  kwp: number
  annualKwh: { low: number; base: number; high: number }
  monthlyKwh: number[]
}

export function estimateProduction(kwp: number, y: SpecificYield): CalcResult<ProductionEstimate> {
  if (!isPositive(kwp)) return refuse('missing_input', ['kwp'], 'System size is needed.')
  if (!isPositive(y.annual) || y.monthly.length !== 12) return refuse('missing_input', ['solarResource'], 'Solar data for this location is not available.')
  const base = kwp * y.annual
  const sd = y.annualSd != null && y.annualSd >= 0 ? kwp * y.annualSd : null
  // ±1 SD of year-to-year weather; without it, a conservative ±10%.
  const spread = sd ?? base * 0.1
  return {
    ok: true,
    value: { kwp, annualKwh: { low: Math.max(0, base - spread), base, high: base + spread }, monthlyKwh: y.monthly.map((m) => m * kwp) },
    basis: 'assumed',
    assumptions: [
      { id: 'solar.resource', description: `Solar resource from ${y.source} for a ${y.tiltDeg}° tilt facing ${aspectText(y.aspectDeg)}, with ${y.lossPct}% system losses.` },
      { id: 'solar.range', description: sd != null ? 'Range is ±1 standard deviation of year-to-year weather from the same data.' : 'Year-to-year variation not reported; range shown as ±10%.' },
    ],
    warnings: ['Shading from trees, tanks or neighbouring buildings is not modelled — a site visit confirms it.'],
  }
}

export function aspectText(aspectDeg: number): string {
  // PVGIS aspect: 0 = south, 90 = west, -90 = east, ±180 = north.
  const d = ((aspectDeg % 360) + 540) % 360 - 180
  const names: [number, string][] = [[0, 'south'], [45, 'south-west'], [90, 'west'], [135, 'north-west'], [180, 'north'], [-45, 'south-east'], [-90, 'east'], [-135, 'north-east'], [-180, 'north']]
  return names.reduce((best, n) => (Math.abs(n[0] - d) < Math.abs(best[0] - d) ? n : best))[1]
}

export interface SolarSavings {
  /** Bill saving per year if every solar kWh offsets a purchased kWh (all used at home, or fully credited). */
  annualUpper: number
  /** Bill saving per year if only the daytime share of usage is offset (no export credit counted). */
  annualDaytime: number
  /** kWh per year the system makes beyond what the home uses (value depends on the net-billing agreement). */
  annualExcessKwh: number
}

/**
 * Bill savings month by month at the approved tariff's MARGINAL rate.
 * `monthlyUsageKwh` is the household's own usage (12 values, or one value
 * repeated). Export credits under net billing are NOT valued here.
 */
export function estimateSavings(t: TariffVersion, production: ProductionEstimate, monthlyUsageKwh: number[], daytimeShare: number, onDate: string): CalcResult<SolarSavings> {
  const usage = monthlyUsageKwh.length === 1 ? Array(12).fill(monthlyUsageKwh[0]) : monthlyUsageKwh
  if (usage.length !== 12 || !usage.every(isNonNegative)) return refuse('missing_input', ['monthlyUsageKwh'], 'Enter your monthly electricity use in kWh (from your JPS bill).')
  if (!(daytimeShare >= 0 && daytimeShare <= 1)) return refuse('invalid_input', ['daytimeShare'], 'Daytime share must be between 0% and 100%.')
  let upper = 0
  let daytime = 0
  let excess = 0
  let first: CalcResult<unknown> | null = null
  for (let m = 0; m < 12; m++) {
    const solar = production.monthlyKwh[m]
    const full = marginalSaving(t, usage[m], Math.min(solar, usage[m]), onDate)
    const day = marginalSaving(t, usage[m], Math.min(solar, usage[m] * daytimeShare), onDate)
    if (!full.ok) return full
    if (!day.ok) return day
    first ??= full
    upper += full.value.saving
    daytime += day.value.saving
    excess += Math.max(0, solar - usage[m])
  }
  const f = first as Extract<CalcResult<unknown>, { ok: true }>
  return {
    ok: true,
    value: { annualUpper: upper, annualDaytime: daytime, annualExcessKwh: excess },
    basis: 'assumed',
    assumptions: [
      ...f.assumptions,
      { id: 'solar.daytime_share', description: `${Math.round(daytimeShare * 100)}% of your electricity is used while the sun is up (your setting).`, value: daytimeShare },
      { id: 'solar.marginal', description: 'Savings use the price of the last kWh on each bill (fixed charges stay), not the average price.' },
    ],
    warnings: excess > 0 ? ['Some output exceeds your usage; what it is worth depends on a JPS net-billing agreement and is not counted.'] : [],
  }
}

export interface SystemRecommendation {
  /** Panels needed so yearly output ≈ yearly use (rounded up). */
  neededModules: number
  /** What we recommend: the smaller of "needed" and "fits on the roof". */
  modules: number
  kwp: number
  limitedByRoof: boolean
}

/**
 * Size the system to the household's own use rather than filling the roof:
 * enough panels for yearly output ≈ yearly use, capped by what fits.
 */
export function recommendSystem(roof: RoofSizing, y: SpecificYield, monthlyUsageKwh: number, moduleWatts: number = SOLAR_DEFAULTS.moduleWatts): CalcResult<SystemRecommendation> {
  if (!isPositive(monthlyUsageKwh)) return refuse('missing_input', ['monthlyUsageKwh'], 'Enter your monthly kWh to size a system to your use.')
  if (!isPositive(y.annual)) return refuse('missing_input', ['solarResource'], 'Solar data for this location is not available.')
  const neededKwp = (monthlyUsageKwh * 12) / y.annual
  const neededModules = Math.max(1, Math.ceil((neededKwp * 1000) / moduleWatts))
  const modules = Math.min(neededModules, roof.modules)
  return {
    ok: true,
    value: { neededModules, modules, kwp: (modules * moduleWatts) / 1000, limitedByRoof: neededModules > roof.modules },
    basis: 'customer_entered',
    assumptions: [{ id: 'solar.sized_to_use', description: `Sized so yearly output roughly matches your ${Math.round(monthlyUsageKwh)} kWh a month.` }],
    warnings: [],
  }
}
