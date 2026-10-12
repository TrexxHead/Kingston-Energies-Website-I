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

describe('deriveGroupStatus', () => {
  it('available now requires a current availability count above zero', () => {
    expect(deriveGroupStatus(2, [obs({ availableCount: 1 })], [], NOW).state).toBe('available_now')
  })

  it('a missing availability field is never zero, available or closed', () => {
    const s = deriveGroupStatus(2, [obs({})], [], NOW)
    expect(s.state).toBe('status_unavailable')
  })

  it('zero available is not inferred as in use', () => {
    const s = deriveGroupStatus(2, [obs({ availableCount: 0 })], [], NOW)
    expect(s.state).toBe('status_unavailable')
    expect(s.detail).toMatch(/does not say/)
  })

  it('in use only when the provider explicitly supports it', () => {
    const s = deriveGroupStatus(2, [obs({ source: 'operator_feed', availableCount: 0, inUseCount: 2, supportsInUse: true })], [], NOW)
    expect(s.state).toBe('in_use')
  })

  it('out of service when the provider reports every connector out', () => {
    expect(deriveGroupStatus(2, [obs({ outOfServiceCount: 2, availableCount: 0 })], [], NOW).state).toBe('out_of_service')
  })

  it('stale status is labelled, not shown as live', () => {
    const s = deriveGroupStatus(2, [obs({ availableCount: 2, observedAt: minsAgo(90) })], [], NOW)
    expect(s.state).toBe('status_may_be_outdated')
  })

  it('a retrieval time never stands in for a missing observation time', () => {
    const s = deriveGroupStatus(2, [obs({ availableCount: 2, observedAt: null })], [], NOW)
    expect(s.state).toBe('status_unavailable')
    expect(s.observedAt).toBeNull()
    expect(s.detail).toMatch(/without an observation time/)
  })

  it('community reports show only when moderated, and never override current provider status', () => {
    const report = { kind: 'successful_charge' as const, observedAt: minsAgo(60), moderation: 'approved' as const }
    expect(deriveGroupStatus(1, [], [report], NOW).state).toBe('recently_reported_working')
    expect(deriveGroupStatus(1, [], [{ ...report, moderation: 'pending' }], NOW).state).toBe('status_unavailable')
    expect(deriveGroupStatus(1, [obs({ outOfServiceCount: 1 })], [report], NOW).state).toBe('out_of_service')
  })

  it('no data at all is status unavailable', () => {
    expect(deriveGroupStatus(1, [], [], NOW).state).toBe('status_unavailable')
  })
})

describe('stationStatusSummary', () => {
  it('names the connector group rather than implying the whole site is ready', () => {
    const avail = deriveGroupStatus(1, [obs({ availableCount: 1 })], [], NOW)
    const unk = deriveGroupStatus(1, [], [], NOW)
    expect(stationStatusSummary([{ connectorType: 'CCS2', status: avail }, { connectorType: 'Type 2', status: unk }])).toBe('Availability reported for CCS2')
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
    expect(deriveGroupStatus(2, [t2.observation], [], NOW).state).toBe('status_unavailable')
    expect(deriveGroupStatus(2, [ccs.observation], [], NOW).state).toBe('available_now')
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
