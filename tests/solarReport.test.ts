import { describe, it, expect } from 'vitest'
import { encodeSnapshot, decodeSnapshot, simplifyRing, type SolarSnapshot } from '@/lib/solar/report'

const snap: SolarSnapshot = {
  v: 1, date: '2026-10-18', engine: '1.8.0', place: { parish: 'St. Andrew', lat: 18.01, lng: -76.75 },
  roof: { type: 'Zinc (corrugated metal)', areaM2: 120, source: 'map_footprint', ring: [[-76.75, 18.01], [-76.7499, 18.01], [-76.7499, 18.0101], [-76.75, 18.01]] },
  system: { modules: 8, kwp: 3.6, tiltDeg: 20, facing: 'south', lossPct: 14 }, production: null, usage: null, savings: null, battery: null, price: null, batteryPrice: null, assumptions: ['TEST – “quotes” & ünïcode'],
}
describe('solar report snapshot', () => {
  it('round-trips through a URL-safe code, including non-ASCII text', () => {
    const code = encodeSnapshot(snap)
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeSnapshot(code)).toEqual(snap)
    expect(decodeSnapshot('not-a-report')).toBeNull()
  })
  it('keeps long roof outlines short', () => {
    const ring = Array.from({ length: 400 }, (_, i) => [-76.75 + i * 1e-7, 18.01] as [number, number])
    expect(simplifyRing(ring).length).toBeLessThanOrEqual(40)
  })
})
