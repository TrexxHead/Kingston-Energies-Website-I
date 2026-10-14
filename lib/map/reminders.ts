import { FRESHNESS_MS } from './status'

/**
 * Staff status reminders (roadmap M2). A "working" check counts for 7 days
 * and a fault for 30; after that the public map falls back to "Status
 * unknown". This picks out what staff should re-check today so a station
 * doesn't lapse silently. Pure — the cron route loads the data.
 */

export interface ReminderStation {
  id: string
  name: string
  parish: string
  groups: {
    connectorType: string
    /** staff_check observations for this group, any order. */
    checks: { observedAt: string; availableCount: number | null; outOfServiceCount: number | null }[]
  }[]
}

export interface ReminderReport {
  stationId: string
  stationName: string
  kind: string
  observedAt: string
}

export interface ReminderItem {
  stationId: string
  name: string
  parish: string
  /** Connector types this line is about. */
  connectors: string[]
  /** The relevant check time. */
  checkedAt: string
}

export interface ReminderDigest {
  /** Confirmed working, but the confirmation runs out within the next day. */
  expiringSoon: ReminderItem[]
  /** Confirmed working until recently — lapsed to "Status unknown" in the last day. */
  justLapsed: ReminderItem[]
  /** Marked out of service more than 7 days ago — is it fixed? */
  longFaults: ReminderItem[]
  /** Pending driver reports that the charger isn't working. */
  faultReports: ReminderReport[]
  isEmpty: boolean
}

const DAY = 24 * 60 * 60_000
export const FAULT_RECHECK_MS = 7 * DAY
const FAULT_KINDS = new Set(['equipment_fault', 'access_blocked', 'connector_missing'])

export function reminderDigest(stations: ReminderStation[], pendingReports: ReminderReport[], now = new Date()): ReminderDigest {
  const t = now.getTime()
  const expiringSoon: ReminderItem[] = []
  const justLapsed: ReminderItem[] = []
  const longFaults: ReminderItem[] = []
  const working = FRESHNESS_MS.staff_check

  for (const s of stations) {
    const buckets = new Map<'soon' | 'lapsed' | 'fault', { connectors: string[]; checkedAt: string }>()
    for (const g of s.groups) {
      const latest = [...g.checks].filter((c) => !Number.isNaN(Date.parse(c.observedAt))).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0]
      if (!latest) continue
      const age = t - Date.parse(latest.observedAt)
      let key: 'soon' | 'lapsed' | 'fault' | null = null
      if ((latest.availableCount ?? 0) > 0) {
        if (age < working && age >= working - DAY) key = 'soon'
        else if (age >= working && age < working + DAY) key = 'lapsed'
      } else if ((latest.outOfServiceCount ?? 0) > 0 && age >= FAULT_RECHECK_MS) {
        key = 'fault'
      }
      if (!key) continue
      const b = buckets.get(key) ?? { connectors: [], checkedAt: latest.observedAt }
      b.connectors.push(g.connectorType)
      if (Date.parse(latest.observedAt) < Date.parse(b.checkedAt)) b.checkedAt = latest.observedAt
      buckets.set(key, b)
    }
    for (const [key, b] of buckets) {
      const item = { stationId: s.id, name: s.name, parish: s.parish, connectors: b.connectors, checkedAt: b.checkedAt }
      ;(key === 'soon' ? expiringSoon : key === 'lapsed' ? justLapsed : longFaults).push(item)
    }
  }
  const faultReports = pendingReports.filter((r) => FAULT_KINDS.has(r.kind))
  const byName = (a: ReminderItem, b: ReminderItem) => a.name.localeCompare(b.name)
  expiringSoon.sort(byName)
  justLapsed.sort(byName)
  longFaults.sort(byName)
  return { expiringSoon, justLapsed, longFaults, faultReports, isEmpty: !expiringSoon.length && !justLapsed.length && !longFaults.length && !faultReports.length }
}
