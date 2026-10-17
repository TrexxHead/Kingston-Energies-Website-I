import { describe, it, expect, afterEach, vi } from 'vitest'
import { deriveGroupStatus, stationStatusSummary, type StatusObservation } from '@/lib/map/status'
import { normalizePlaces, clampToJamaica, textSearchEvChargers, PLACES_FIELD_MASK } from '@/lib/map/googlePlaces'
import { PARISHES } from '@/lib/map/parishes'

const NOW = new Date('2026-10-12T12:00:00Z')
const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString()

function obs(over: Partial<StatusObservation>): StatusObservation {
  return {
    source: 'google_places',
    observedAt: minsAgo(2),
    retrievedAt: NOW.toISOString(),
    availableCount: null,
    outOfServiceCount: null,
    inUseCount: null,
    supportsInUse: false,
    ...over,
  }
}

const daysAgo = (d: number) => minsAgo(d * 24 * 60)
const staff = (over: Partial<StatusObservation>) => obs({ source: 'staff_check', supportsInUse: false, ...over })

describe('deriveGroupStatus — three public states', () => {
  it('available requires a current confirmed-working count above zero', () => {
    expect(deriveGroupStatus(2, [obs({ availableCount: 1 })], [], NOW).state).toBe('available')
  })

  it('a missing availability field is never zero, available or closed', () => {
    expect(deriveGroupStatus(2, [obs({})], [], NOW).state).toBe('status_unknown')
  })

  it('zero available is not inferred as broken or busy', () => {
    const s = deriveGroupStatus(2, [obs({ availableCount: 0 })], [], NOW)
    expect(s.state).toBe('status_unknown')
    expect(s.detail).toMatch(/not whether/)
  })

  it('"in use" from a feed is shown as status unknown with the reason, never as available', () => {
    const s = deriveGroupStatus(2, [obs({ source: 'operator_feed', availableCount: 0, inUseCount: 2, supportsInUse: true })], [], NOW)
    expect(s.state).toBe('status_unknown')
    expect(s.detail).toMatch(/in use/)
  })

  it('out of service when every connector is reported out', () => {
    expect(deriveGroupStatus(2, [obs({ outOfServiceCount: 2, availableCount: 0 })], [], NOW).state).toBe('out_of_service')
  })

  it('stale feed status falls back to unknown, saying when it was last seen', () => {
    const s = deriveGroupStatus(2, [obs({ availableCount: 2, observedAt: minsAgo(90) })], [], NOW)
    expect(s.state).toBe('status_unknown')
    expect(s.detail).toMatch(/Last confirmed working by Google/)
  })

  it('a retrieval time never stands in for a missing observation time', () => {
    const s = deriveGroupStatus(2, [obs({ availableCount: 2, observedAt: null })], [], NOW)
    expect(s.state).toBe('status_unknown')
    expect(s.observedAt).toBeNull()
    expect(s.detail).toMatch(/without an observation time/)
  })

  it('a moderated community report is a hint in the detail, never a confirmation', () => {
    const report = { kind: 'successful_charge' as const, observedAt: minsAgo(60), moderation: 'approved' as const }
    const s = deriveGroupStatus(1, [], [report], NOW)
    expect(s.state).toBe('status_unknown')
    expect(s.detail).toMatch(/driver reported a successful charge/)
    expect(deriveGroupStatus(1, [], [{ ...report, moderation: 'pending' }], NOW).detail).not.toMatch(/driver/)
    expect(deriveGroupStatus(1, [obs({ outOfServiceCount: 1 })], [report], NOW).state).toBe('out_of_service')
  })

  it('no data at all is status unknown', () => {
    expect(deriveGroupStatus(1, [], [], NOW).state).toBe('status_unknown')
  })
})

describe('Kingston Energies status checks (admin)', () => {
  it('a working check shows Available for 7 days, then Status unknown with the date', () => {
    const fresh = deriveGroupStatus(2, [staff({ availableCount: 2, outOfServiceCount: 0, observedAt: daysAgo(6) })], [], NOW)
    expect(fresh.state).toBe('available')
    expect(fresh.detail).toBe('Confirmed working by Kingston Energies 6 days ago.')
    const stale = deriveGroupStatus(2, [staff({ availableCount: 2, outOfServiceCount: 0, observedAt: daysAgo(8) })], [], NOW)
    expect(stale.state).toBe('status_unknown')
    expect(stale.detail).toMatch(/Last confirmed working by Kingston Energies 8 days ago/)
  })

  it('an out-of-service check lasts 30 days', () => {
    expect(deriveGroupStatus(1, [staff({ availableCount: 0, outOfServiceCount: 1, observedAt: daysAgo(20) })], [], NOW).state).toBe('out_of_service')
    const old = deriveGroupStatus(1, [staff({ availableCount: 0, outOfServiceCount: 1, observedAt: daysAgo(31) })], [], NOW)
    expect(old.state).toBe('status_unknown')
    expect(old.detail).toMatch(/not re-checked/)
  })

  it('works when the connector count is unknown', () => {
    expect(deriveGroupStatus(null, [staff({ availableCount: 0, outOfServiceCount: 1 })], [], NOW).state).toBe('out_of_service')
    expect(deriveGroupStatus(null, [staff({ availableCount: 1, outOfServiceCount: 0 })], [], NOW).state).toBe('available')
  })

  it('the newest check wins, and clearing returns to unknown', () => {
    const older = staff({ availableCount: 1, outOfServiceCount: 0, observedAt: daysAgo(2) })
    const newer = staff({ availableCount: 0, outOfServiceCount: 1, observedAt: daysAgo(1) })
    expect(deriveGroupStatus(1, [older, newer], [], NOW).state).toBe('out_of_service')
    const cleared = staff({ availableCount: null, outOfServiceCount: null, observedAt: minsAgo(5) })
    const s = deriveGroupStatus(1, [newer, cleared], [], NOW)
    expect(s.state).toBe('status_unknown')
    expect(s.detail).toMatch(/cleared/)
  })
})

describe('stationStatusSummary', () => {
  const avail = deriveGroupStatus(1, [obs({ availableCount: 1 })], [], NOW)
  const unk = deriveGroupStatus(1, [], [], NOW)
  const out = deriveGroupStatus(1, [obs({ outOfServiceCount: 1, availableCount: 0 })], [], NOW)
  it('names the connector group rather than implying the whole site is ready', () => {
    expect(stationStatusSummary([{ connectorType: 'CCS2', status: avail }, { connectorType: 'Type 2', status: unk }])).toBe('Available: CCS2')
    expect(stationStatusSummary([{ connectorType: 'CCS2', status: avail }])).toBe('Available')
    expect(stationStatusSummary([{ connectorType: 'CCS2', status: out }, { connectorType: 'Type 2', status: unk }])).toBe('Out of service: CCS2')
    expect(stationStatusSummary([{ connectorType: 'CCS2', status: out }])).toBe('Out of service')
    expect(stationStatusSummary([{ connectorType: 'Type 2', status: unk }])).toBe('Status unknown')
  })
})

describe('Google Places normalisation', () => {
  // Shape follows Google's documented Place.evChargeOptions; values are synthetic.
  const payload = {
    places: [
      {
        id: 'synthetic-place-1',
        displayName: { text: 'Test plaza charger' },
        location: { latitude: 18.0, longitude: -76.8 },
        evChargeOptions: {
          connectorCount: 4,
          connectorAggregation: [
            { type: 'EV_CONNECTOR_TYPE_CCS_COMBO_2', maxChargeRateKw: 50, count: 2, availableCount: 1, outOfServiceCount: 0, availabilityLastUpdateTime: minsAgo(3) },
            { type: 'EV_CONNECTOR_TYPE_TYPE_2', maxChargeRateKw: 7.4, count: 2 },
          ],
        },
      },
      { id: 'no-location' },
    ],
  }

  it('keeps provider observation time separate and leaves absent counts null', () => {
    const places = normalizePlaces(payload, NOW.toISOString())
    expect(places).toHaveLength(1)
    const [ccs, t2] = places[0].connectorGroups
    expect(ccs.connectorType).toBe('CCS2')
    expect(ccs.observation.observedAt).toBe(minsAgo(3))
    expect(ccs.observation.retrievedAt).toBe(NOW.toISOString())
    expect(t2.observation.availableCount).toBeNull()
    expect(t2.observation.observedAt).toBeNull()
    expect(places[0].attribution).toBe('Google Maps')
    expect(deriveGroupStatus(2, [t2.observation], [], NOW).state).toBe('status_unknown')
    expect(deriveGroupStatus(2, [ccs.observation], [], NOW).state).toBe('available')
  })

  it('clamps searches to Jamaica', () => {
    expect(clampToJamaica({ north: 30, south: 25, east: -70, west: -80 })).toBeNull()
    const c = clampToJamaica({ north: 19, south: 17, east: -76, west: -79 })
    expect(c).toEqual({ north: 18.53, south: 17.7, east: -76.18, west: -78.4 })
  })

  it('field mask is explicit and minimal', () => {
    expect(PLACES_FIELD_MASK).not.toContain('*')
    expect(PLACES_FIELD_MASK).toContain('places.evChargeOptions')
  })
})

describe('textSearchEvChargers', () => {
  const original = process.env.GOOGLE_MAPS_SERVER_KEY
  afterEach(() => {
    if (original === undefined) delete process.env.GOOGLE_MAPS_SERVER_KEY
    else process.env.GOOGLE_MAPS_SERVER_KEY = original
  })

  it('reports not configured without a server key instead of returning demo data', async () => {
    delete process.env.GOOGLE_MAPS_SERVER_KEY
    const r = await textSearchEvChargers({ bounds: { north: 18.1, south: 17.9, east: -76.7, west: -76.9 } })
    expect(r).toEqual({ ok: false, status: 503, message: 'Google discovery is not configured.' })
  })

  it('sends a bounded, field-masked request', async () => {
    process.env.GOOGLE_MAPS_SERVER_KEY = 'test-key'
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ places: [] }), { status: 200 }))
    const r = await textSearchEvChargers({ bounds: { north: 18.1, south: 17.9, east: -76.7, west: -76.9 } }, fetchImpl as unknown as typeof fetch)
    expect(r.ok).toBe(true)
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['X-Goog-FieldMask']).toBe(PLACES_FIELD_MASK)
    const body = JSON.parse(init.body as string)
    expect(body.includedType).toBe('electric_vehicle_charging_station')
    expect(body.pageSize).toBe(20)
  })
})

describe('parishes', () => {
  it('has all 14 parishes', () => {
    expect(PARISHES).toHaveLength(14)
  })
})
