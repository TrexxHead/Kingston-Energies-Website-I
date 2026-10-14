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

describe('admin status checks', () => {
  it('records working / out of service / unknown as counts the status logic understands', async () => {
    const { checkObservation } = await import('@/lib/map/registry')
    expect(checkObservation('working', 2)).toEqual({ availableCount: 2, outOfServiceCount: 0 })
    expect(checkObservation('out_of_service', null)).toEqual({ availableCount: 0, outOfServiceCount: 1 })
    expect(checkObservation('unknown', 3)).toEqual({ availableCount: null, outOfServiceCount: null })
  })

  it('refuses future or month-old check times', async () => {
    const { checkTimeProblem } = await import('@/lib/map/registry')
    const now = new Date('2026-10-14T12:00:00Z')
    expect(checkTimeProblem(new Date('2026-10-14T11:00:00Z'), now)).toBeNull()
    expect(checkTimeProblem(new Date('2026-10-14T13:00:00Z'), now)).toMatch(/future/)
    expect(checkTimeProblem(new Date('2026-09-01T12:00:00Z'), now)).toMatch(/30 days/)
  })

  it('validates the request shape', async () => {
    const { statusCheckSchema } = await import('@/lib/map/registry')
    expect(statusCheckSchema.safeParse({ checks: [{ groupId: 'g1', state: 'working' }], method: 'phone_call' }).success).toBe(true)
    expect(statusCheckSchema.safeParse({ checks: [], method: 'phone_call' }).success).toBe(false)
    expect(statusCheckSchema.safeParse({ checks: [{ groupId: 'g1', state: 'in_use' }], method: 'phone_call' }).success).toBe(false)
  })
})
