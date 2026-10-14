import { describe, it, expect } from 'vitest'
import { reminderDigest, type ReminderStation } from '@/lib/map/reminders'

const now = new Date('2026-10-14T12:00:00Z')
const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString()
const working = (h: number) => ({ observedAt: ago(h), availableCount: 2, outOfServiceCount: 0 })
const broken = (h: number) => ({ observedAt: ago(h), availableCount: 0, outOfServiceCount: 1 })
const st = (id: string, ...groups: { connectorType: string; checks: ReturnType<typeof working>[] }[]): ReminderStation => ({ id, name: `Station ${id}`, parish: 'Kingston', groups })

describe('station status reminders', () => {
  it('sorts checks into expiring, lapsed and long faults by the LATEST check per group', () => {
    const d = reminderDigest(
      [
        st('a', { connectorType: 'CCS', checks: [working(160)] }), // 6d16h → expires within a day
        st('b', { connectorType: 'Type 2', checks: [working(170)] }), // 7d2h → just lapsed
        st('c', { connectorType: 'CCS', checks: [working(200)] }), // lapsed > a day ago → not repeated daily
        st('d', { connectorType: 'CCS', checks: [broken(200)] }), // fault older than 7 days
        st('e', { connectorType: 'CCS', checks: [broken(24)] }), // recent fault → not yet
        st('f', { connectorType: 'CCS', checks: [working(160), working(2)] }), // re-checked → nothing due
        st('g', { connectorType: 'CCS', checks: [] }), // never checked → not in the digest
      ],
      [],
      now,
    )
    expect(d.expiringSoon.map((i) => i.stationId)).toEqual(['a'])
    expect(d.justLapsed.map((i) => i.stationId)).toEqual(['b'])
    expect(d.longFaults.map((i) => i.stationId)).toEqual(['d'])
    expect(d.isEmpty).toBe(false)
  })
  it('groups connector types of one station on one line', () => {
    const d = reminderDigest([st('a', { connectorType: 'CCS', checks: [working(165)] }, { connectorType: 'CHAdeMO', checks: [working(150)] })], [], now)
    expect(d.expiringSoon).toHaveLength(1)
    expect(d.expiringSoon[0].connectors).toEqual(['CCS', 'CHAdeMO'])
    expect(d.expiringSoon[0].checkedAt).toBe(ago(165))
  })
  it('lists only pending fault-type reports and reports empty when nothing is due', () => {
    const reports = [
      { stationId: 'a', stationName: 'A', kind: 'equipment_fault', observedAt: ago(3) },
      { stationId: 'b', stationName: 'B', kind: 'successful_charge', observedAt: ago(3) },
    ]
    expect(reminderDigest([], reports, now).faultReports.map((r) => r.stationId)).toEqual(['a'])
    expect(reminderDigest([], [reports[1]], now).isEmpty).toBe(true)
  })
})
