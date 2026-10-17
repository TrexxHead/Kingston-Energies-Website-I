import { type CalcResult, type Assumption, refuse, isPositive, isNonNegative } from './result'

/**
 * EV trip energy and charge stops (roadmap L1).
 *
 * Energy per km comes from the driver's own kWh/100 km (flat-road
 * figure). Hills: climbing m·g·h ÷ drivetrain efficiency, descending gives
 * back m·g·h × regen share — only when the vehicle's mass is given; without
 * it hills are left out and the result says so.
 *
 * Charge stops: walking the route, when the battery would fall below the
 * reserve, add a stop at the last charger passed (charge to 80%; raised to
 * 100% only if 80% can't reach the next charger) and walk again. Only
 * chargers marked near the route are used; if none can bridge the gap, the
 * plan says where it runs short instead of pretending.
 */

export const TRIP_DEFAULTS = {
  drivetrainEfficiency: 0.85,
  regenShare: 0.6,
  chargeTargetPct: 80,
} as const

export interface RoutePoint {
  /** Distance from the start, km. */
  km: number
  elevationM?: number | null
  /** A charger close to the route at this point. */
  charger?: { id: string; name: string } | null
}

export interface TripInput {
  points: RoutePoint[]
  kwhPer100km: number
  batteryKwh: number
  startPct: number
  reservePct: number
  vehicleMassKg?: number
}

export interface ChargeStop {
  chargerId: string
  name: string
  atKm: number
  arrivePct: number
  chargeToPct: number
  addKwh: number
}

export interface TripResult {
  distanceKm: number
  energyKwh: number
  arrivePct: number
  stops: ChargeStop[]
  hillsIncluded: boolean
  /** True when the trip can't be done with the chargers near this route. */
  stranded: { atKm: number } | null
}

export function tripPlan(i: TripInput): CalcResult<TripResult> {
  if (i.points.length < 2) return refuse('missing_input', ['points'], 'A route is needed.')
  if (!isPositive(i.kwhPer100km) || i.kwhPer100km > 60) return refuse('missing_input', ['kwhPer100km'], 'Enter the EV’s energy use (kWh per 100 km).')
  if (!isPositive(i.batteryKwh) || i.batteryKwh > 250) return refuse('missing_input', ['batteryKwh'], 'Enter the usable battery size (kWh).')
  if (!(i.startPct > 0 && i.startPct <= 100)) return refuse('invalid_input', ['startPct'], 'Starting charge must be 1–100%.')
  if (!isNonNegative(i.reservePct) || i.reservePct >= i.startPct) return refuse('invalid_input', ['reservePct'], 'The reserve must be below the starting charge.')

  const assumptions: Assumption[] = [{ id: 'trip.flat_rate', description: `Energy use ${i.kwhPer100km} kWh/100 km on the flat (your figure); air-con, speed and traffic change it.` }]
  const warnings: string[] = []
  const hills = isPositive(i.vehicleMassKg) && i.points.every((p) => p.elevationM != null)
  if (hills) assumptions.push({ id: 'trip.hills', description: `Hills: climbing at ${TRIP_DEFAULTS.drivetrainEfficiency * 100}% drivetrain efficiency, ${TRIP_DEFAULTS.regenShare * 100}% of descent energy recovered.` })
  else warnings.push('Hills are not included — add the vehicle’s weight (and a route with elevation) for a hill-aware estimate. Jamaica’s hills can add a lot.')

  const legKwh = (a: RoutePoint, b: RoutePoint) => {
    let e = ((b.km - a.km) * i.kwhPer100km) / 100
    if (hills) {
      const dh = (b.elevationM as number) - (a.elevationM as number)
      const j = (i.vehicleMassKg as number) * 9.81 * Math.abs(dh)
      const kwh = j / 3.6e6
      e += dh > 0 ? kwh / TRIP_DEFAULTS.drivetrainEfficiency : -kwh * TRIP_DEFAULTS.regenShare
    }
    return e
  }

  const pct = (kwh: number) => (kwh / i.batteryKwh) * 100
  const pts = [...i.points].sort((a, b) => a.km - b.km)
  const legs = pts.slice(1).map((p, k) => legKwh(pts[k], p))
  const energyKwh = legs.reduce((s, e) => s + e, 0)
  const distanceKm = pts[pts.length - 1].km - pts[0].km

  // Charge targets per charger index; raised from 80% to 100% only when needed.
  const targets = new Map<number, number>()
  for (let guard = 0; guard < pts.length * 2 + 2; guard++) {
    let soc = i.startPct
    let lastCharger: number | null = null
    let failAt: number | null = null
    const stops: ChargeStop[] = []
    for (let k = 0; k < legs.length; k++) {
      if (pts[k].charger && targets.has(k)) {
        const to = Math.max(targets.get(k)!, soc)
        stops.push({ chargerId: pts[k].charger!.id, name: pts[k].charger!.name, atKm: pts[k].km, arrivePct: soc, chargeToPct: to, addKwh: ((to - soc) / 100) * i.batteryKwh })
        soc = to
      }
      if (pts[k].charger) lastCharger = k
      soc -= pct(legs[k])
      if (soc < i.reservePct) {
        failAt = k + 1
        break
      }
    }
    if (failAt == null) return { ok: true, value: { distanceKm, energyKwh, arrivePct: soc, stops, hillsIncluded: hills, stranded: null }, basis: 'customer_entered', assumptions, warnings }
    // Add (or raise) a stop at the last charger before the shortfall.
    if (lastCharger == null || targets.get(lastCharger) === 100) {
      return {
        ok: true,
        value: { distanceKm, energyKwh, arrivePct: soc, stops, hillsIncluded: hills, stranded: { atKm: pts[failAt].km } },
        basis: 'customer_entered',
        assumptions,
        warnings: [...warnings, 'With the chargers we know near this route, the battery would fall below your reserve. Plan another charge or start fuller.'],
      }
    }
    targets.set(lastCharger, targets.has(lastCharger) ? 100 : TRIP_DEFAULTS.chargeTargetPct)
  }
  return refuse('invalid_input', ['points'], 'The route could not be planned.')
}
