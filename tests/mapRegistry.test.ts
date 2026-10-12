import { describe, it, expect } from 'vitest'
import { publishBlockers, sourceVerifiable, stationInputSchema } from '@/lib/map/registry'

const base = { parish: 'kingston', lat: 18.0, lng: -76.8, connectorGroups: [{ connectorType: 'Type 2' }], sources: [{ reviewState: 'verified' }] }

describe('publishBlockers', () => {
  it('allows a complete station', () => {
    expect(publishBlockers(base)).toEqual([])
  })
  it('requires a verified, unexpired source', () => {
    expect(publishBlockers({ ...base, sources: [{ reviewState: 'unverified' }] })).toHaveLength(1)
    expect(publishBlockers({ ...base, sources: [{ reviewState: 'verified', expiresAt: '2020-01-01T00:00:00Z' }] })).toHaveLength(1)
  })
  it('requires connector groups and Jamaican coordinates', () => {
    const r = publishBlockers({ ...base, lat: 25, connectorGroups: [] })
    expect(r.join(' ')).toMatch(/outside Jamaica/)
    expect(r.join(' ')).toMatch(/connector group/)
  })
})

describe('sourceVerifiable', () => {
  it('refuses community reports and evidence-free sources', () => {
    expect(sourceVerifiable({ sourceType: 'community', url: 'https://x.invalid', notes: null })).not.toBeNull()
    expect(sourceVerifiable({ sourceType: 'field_visit', url: null, notes: 'ok' })).not.toBeNull()
    expect(sourceVerifiable({ sourceType: 'field_visit', url: null, notes: 'Visited 12 Oct, 2× Type 2 working, staff confirmed public access' })).toBeNull()
  })
})

describe('stationInputSchema', () => {
  it('rejects coordinates outside Jamaica', () => {
    const r = stationInputSchema.safeParse({ name: 'X', parish: 'kingston', lat: 40, lng: -76.8, access: 'public', connectorGroups: [] })
    expect(r.success).toBe(false)
  })
})
