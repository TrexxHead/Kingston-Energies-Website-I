import { describe, it, expect } from 'vitest'
import { parseOcpiLocations, groupObservation } from '@/lib/map/ocpi'
import { deriveGroupStatus } from '@/lib/map/status'

// Shape per OCPI 2.2.1, module Locations (Location → EVSE → Connector).
const response = {
  status_code: 1000,
  timestamp: '2026-10-14T15:00:00Z',
  data: [
    {
      id: 'LOC1',
      name: 'Test Plaza',
      evses: [
        { uid: 'E1', status: 'AVAILABLE', last_updated: '2026-10-14T14:58:00Z', connectors: [{ id: '1', standard: 'IEC_62196_T2_COMBO', power_type: 'DC' }, { id: '2', standard: 'CHADEMO', power_type: 'DC' }] },
        { uid: 'E2', status: 'CHARGING', last_updated: '2026-10-14T14:57:00Z', connectors: [{ id: '1', standard: 'IEC_62196_T2_COMBO', power_type: 'DC' }] },
        { uid: 'E3', status: 'OUTOFORDER', last_updated: '2026-10-14T14:50:00Z', connectors: [{ id: '1', standard: 'IEC_62196_T2', power_type: 'AC_3_PHASE' }] },
        { uid: 'E4', status: 'PLANNED', last_updated: '2026-10-14T14:00:00Z', connectors: [{ id: '1', standard: 'IEC_62196_T2', power_type: 'AC_3_PHASE' }] },
        { uid: 'E5', status: 'SOMETHING_NEW', last_updated: '2026-10-14T14:00:00Z', connectors: [] },
        { uid: 'E6', status: 'AVAILABLE', connectors: [] },
      ],
    },
    { name: 'no id' },
  ],
}
const now = new Date('2026-10-14T15:00:30Z')
const retrieved = '2026-10-14T15:00:10Z'

describe('OCPI locations', () => {
  it('parses locations and drops EVSEs with unknown status or no time', () => {
    const locs = parseOcpiLocations(response)!
    expect(locs).toHaveLength(1)
    expect(locs[0].evses.map((e) => e.uid)).toEqual(['E1', 'E2', 'E3', 'E4'])
    expect(locs[0].evses[0].connectorTypes).toEqual(['CCS', 'CCS2', 'CHAdeMO'])
    expect(parseOcpiLocations({ data: { id: 'X', evses: [] } })).toHaveLength(1)
    expect(parseOcpiLocations({ status_code: 2001 })).toBeNull()
  })
  it('counts EVSEs per connector type with the stalest EVSE time', () => {
    const [loc] = parseOcpiLocations(response)!
    const ccs = groupObservation(loc, 'CCS', retrieved)!
    expect(ccs).toMatchObject({ source: 'operator_feed', availableCount: 1, inUseCount: 1, outOfServiceCount: 0, observedAt: '2026-10-14T14:57:00.000Z', retrievedAt: retrieved })
    const t2 = groupObservation(loc, 'Type 2', retrieved)! // planned EVSE excluded
    expect(t2).toMatchObject({ availableCount: 0, outOfServiceCount: 1, inUseCount: 0 })
    expect(groupObservation(loc, 'Tesla', retrieved)).toBeNull()
  })
  it('feeds the existing status rules: fresh → available / out of service; stale → unknown', () => {
    const [loc] = parseOcpiLocations(response)!
    expect(deriveGroupStatus(2, [groupObservation(loc, 'CCS', retrieved)!], [], now).state).toBe('available')
    // The faulty AC EVSE reported at 14:50 — current at 14:53, stale by 15:00 (5-minute operator window).
    expect(deriveGroupStatus(1, [groupObservation(loc, 'Type 2', retrieved)!], [], new Date('2026-10-14T14:53:00Z')).state).toBe('out_of_service')
    expect(deriveGroupStatus(1, [groupObservation(loc, 'Type 2', retrieved)!], [], now).state).toBe('status_unknown')
    // 5-minute operator freshness: 20 minutes later it's no longer current.
    expect(deriveGroupStatus(2, [groupObservation(loc, 'CCS', retrieved)!], [], new Date('2026-10-14T15:20:00Z')).state).toBe('status_unknown')
  })
})
