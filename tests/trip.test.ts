import { describe, it, expect } from 'vitest'
import { tripPlan, type RoutePoint } from '@/lib/energy/engine'

// 200 km route, points every 20 km, a charger at km 80 and km 140.
const route = (withHills = false): RoutePoint[] =>
  Array.from({ length: 11 }, (_, k) => ({
    km: k * 20,
    elevationM: withHills ? (k <= 5 ? k * 120 : (10 - k) * 120) : 0,
    charger: k === 4 ? { id: 'c80', name: 'Charger 80' } : k === 7 ? { id: 'c140', name: 'Charger 140' } : null,
  }))

describe('trip planner', () => {
  it('needs no stop when the battery covers the trip', () => {
    const r = tripPlan({ points: route(), kwhPer100km: 15, batteryKwh: 60, startPct: 100, reservePct: 10 })
    expect(r.ok && r.value.stops).toEqual([])
    expect(r.ok && r.value.energyKwh).toBeCloseTo(30, 6)
    expect(r.ok && r.value.arrivePct).toBeCloseTo(50, 6)
    expect(r.ok && r.value.hillsIncluded).toBe(false)
  })
  it('adds a stop at the last charger before the shortfall', () => {
    // 40 kWh battery, 15 kWh/100 km → 7.5% per 20 km. From 90%: falls below 10% after ~213 km… but reserve 30% fails at km 160.
    const r = tripPlan({ points: route(), kwhPer100km: 15, batteryKwh: 40, startPct: 90, reservePct: 30 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.stops.map((s) => s.chargerId)).toEqual(['c140'])
    expect(r.value.stops[0]).toMatchObject({ atKm: 140, chargeToPct: 80 })
    expect(r.value.stops[0].arrivePct).toBeCloseTo(90 - 7 * 7.5, 6)
    expect(r.value.stranded).toBeNull()
    expect(r.value.arrivePct).toBeCloseTo(80 - 3 * 7.5, 6)
  })
  it('says where it runs short when no charger can bridge the gap', () => {
    const r = tripPlan({ points: route().map((p) => ({ ...p, charger: null })), kwhPer100km: 20, batteryKwh: 30, startPct: 100, reservePct: 10 })
    expect(r.ok && r.value.stranded).toEqual({ atKm: 140 })
    expect(r.ok && r.warnings.some((w) => /below your reserve/.test(w))).toBe(true)
  })
  it('counts hills only with the vehicle mass', () => {
    const flat = tripPlan({ points: route(true), kwhPer100km: 15, batteryKwh: 60, startPct: 100, reservePct: 10 })
    const hilly = tripPlan({ points: route(true), kwhPer100km: 15, batteryKwh: 60, startPct: 100, reservePct: 10, vehicleMassKg: 1800 })
    expect(flat.ok && flat.value.energyKwh).toBeCloseTo(30, 6)
    // 600 m up and down: 1800·9.81·600/3.6e6 = 2.943 kWh; ÷0.85 up, −0.6× down → +1.697 kWh net.
    expect(hilly.ok && hilly.value.energyKwh).toBeCloseTo(30 + 2.943 / 0.85 - 2.943 * 0.6, 2)
    expect(hilly.ok && hilly.value.hillsIncluded).toBe(true)
  })
  it('refuses missing inputs', () => {
    expect(tripPlan({ points: route(), kwhPer100km: 0, batteryKwh: 60, startPct: 100, reservePct: 10 }).ok).toBe(false)
    expect(tripPlan({ points: route(), kwhPer100km: 15, batteryKwh: 60, startPct: 20, reservePct: 20 }).ok).toBe(false)
  })
})

import { parseOsrm, routePoints } from '@/lib/map/routing'

describe('routing adapter', () => {
  // OSRM /route/v1 response shape (overview=full, geometries=geojson).
  const osrm = {
    code: 'Ok',
    routes: [{ distance: 22_500, duration: 1800, geometry: { type: 'LineString', coordinates: [[-76.79, 18.0], [-76.75, 18.02], [-76.7, 18.05], [-76.6, 18.06]] } }],
  }
  it('parses the first route and rejects failures', () => {
    const r = parseOsrm(osrm)!
    expect(r.distanceKm).toBe(22.5)
    expect(r.durationMin).toBe(30)
    expect(parseOsrm({ code: 'NoRoute', routes: [] })).toBeNull()
    expect(parseOsrm({ code: 'Ok', routes: [{ distance: 1, duration: 1, geometry: { coordinates: [[1, 2]] } }] })).toBeNull()
  })
  it('samples points scaled to the router distance and attaches only nearby chargers', () => {
    const pts = routePoints(parseOsrm(osrm)!, [
      { id: 'near', name: 'Near', lat: 18.051, lng: -76.701 },
      { id: 'far', name: 'Far', lat: 18.3, lng: -76.7 },
    ])
    expect(pts[0].km).toBe(0)
    expect(pts[pts.length - 1].km).toBeCloseTo(22.5, 6)
    expect(pts.filter((p) => p.charger).map((p) => p.charger!.id)).toEqual(['near'])
  })
})
