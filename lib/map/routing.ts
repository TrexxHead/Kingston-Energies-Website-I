import { haversineKm } from '@/lib/storm/nhc'
import type { RoutePoint } from '@/lib/energy/engine/trip'

/**
 * Road routing for the trip planner (roadmap L1). Any OSRM-compatible
 * server — ideally self-hosted on the Jamaica OpenStreetMap extract — set
 * as OSRM_BASE_URL (e.g. https://router.example.com). Without it the planner
 * says routing isn't available; we never draw straight lines as roads.
 */

export function routingConfigured(): boolean {
  return Boolean(process.env.OSRM_BASE_URL)
}

export interface Route {
  distanceKm: number
  durationMin: number
  /** [lng, lat] pairs along the road. */
  coordinates: [number, number][]
}

export function osrmUrl(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
  const base = (process.env.OSRM_BASE_URL ?? '').replace(/\/$/, '')
  return `${base}/route/v1/driving/${from.lng.toFixed(5)},${from.lat.toFixed(5)};${to.lng.toFixed(5)},${to.lat.toFixed(5)}?overview=full&geometries=geojson&steps=false`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Parse an OSRM /route response (first route). Null when there is no usable route. */
export function parseOsrm(json: any): Route | null {
  if (json?.code !== 'Ok' || !Array.isArray(json.routes) || !json.routes.length) return null
  const r = json.routes[0]
  const coords = r?.geometry?.coordinates
  if (!Number.isFinite(r?.distance) || !Number.isFinite(r?.duration) || !Array.isArray(coords) || coords.length < 2) return null
  if (!coords.every((c: any) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))) return null
  return { distanceKm: r.distance / 1000, durationMin: r.duration / 60, coordinates: coords.map((c: number[]) => [c[0], c[1]] as [number, number]) }
}

/** How close a charger must be to the road to count as "on the way". */
export const NEAR_ROUTE_KM = 1.5

/**
 * Turn a route into planner points every ~stepKm, attaching each nearby
 * charger to the closest point (so the planner can stop there).
 */
export function routePoints(route: Route, chargers: { id: string; name: string; lat: number; lng: number }[], stepKm = 2): RoutePoint[] {
  const cum: number[] = [0]
  for (let k = 1; k < route.coordinates.length; k++) {
    const [a, b] = [route.coordinates[k - 1], route.coordinates[k]]
    cum.push(cum[k - 1] + haversineKm({ lat: a[1], lng: a[0] }, { lat: b[1], lng: b[0] }))
  }
  // Scale to the router's distance so totals match what it reports.
  const scale = cum[cum.length - 1] > 0 ? route.distanceKm / cum[cum.length - 1] : 1
  const points: (RoutePoint & { coordIdx: number })[] = []
  let next = 0
  cum.forEach((d, k) => {
    if (d * scale >= next || k === cum.length - 1) {
      points.push({ km: d * scale, elevationM: null, charger: null, coordIdx: k })
      next = d * scale + stepKm
    }
  })
  for (const c of chargers) {
    let best = { dist: Infinity, idx: -1 }
    route.coordinates.forEach(([lng, lat], k) => {
      const dist = haversineKm({ lat, lng }, c)
      if (dist < best.dist) best = { dist, idx: k }
    })
    if (best.dist > NEAR_ROUTE_KM) continue
    const p = points.reduce((a, b) => (Math.abs(b.coordIdx - best.idx) < Math.abs(a.coordIdx - best.idx) ? b : a))
    if (!p.charger) p.charger = { id: c.id, name: c.name }
  }
  return points.map(({ coordIdx: _, ...p }) => p)
}
