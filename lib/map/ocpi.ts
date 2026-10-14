import type { StatusObservation } from './status'

/**
 * OCPI 2.2.1 Locations → our per-connector-group status observations
 * (roadmap L3). OCPI is the open protocol charge-point operators use to
 * share locations and live EVSE status with partners.
 *
 * An EVSE ("charge point") has one status and one or more connectors; we
 * count EVSEs per connector TYPE so a group "CCS ×2" gets "1 of 2 available".
 * The observation time is the EVSE's own `last_updated` — never our fetch time.
 * Statuses we can't place (PLANNED, REMOVED, UNKNOWN) are left out rather
 * than counted as available or broken.
 */

export const OCPI_STATUS = ['AVAILABLE', 'BLOCKED', 'CHARGING', 'INOPERATIVE', 'OUTOFORDER', 'PLANNED', 'REMOVED', 'RESERVED', 'UNKNOWN'] as const

/** OCPI connector `standard` → the connector names used in our registry. */
const STANDARD_TO_TYPE: Record<string, string[]> = {
  IEC_62196_T2: ['Type 2'],
  IEC_62196_T2_COMBO: ['CCS', 'CCS2'],
  IEC_62196_T1: ['J1772 (Type 1)'],
  IEC_62196_T1_COMBO: ['CCS', 'CCS1'],
  CHADEMO: ['CHAdeMO'],
  TESLA_S: ['Tesla'],
  TESLA_R: ['Tesla'],
  NEMA_5_20: ['Wall outlet'],
  NEMA_6_30: ['Wall outlet'],
  NEMA_14_50: ['Wall outlet'],
  GBT_AC: ['GB/T'],
  GBT_DC: ['GB/T'],
}

export interface OcpiEvse {
  uid: string
  status: string
  lastUpdated: string
  connectorTypes: string[]
}

export interface OcpiLocation {
  id: string
  evses: OcpiEvse[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Parse an OCPI Locations response (`{ data: Location[] }` or a single Location). Bad entries are dropped. */
export function parseOcpiLocations(json: any): OcpiLocation[] | null {
  const raw = Array.isArray(json?.data) ? json.data : json?.data && typeof json.data === 'object' ? [json.data] : null
  if (!raw) return null
  const out: OcpiLocation[] = []
  for (const loc of raw) {
    if (typeof loc?.id !== 'string' || !Array.isArray(loc?.evses)) continue
    const evses: OcpiEvse[] = []
    for (const e of loc.evses) {
      if (typeof e?.uid !== 'string' || !(OCPI_STATUS as readonly string[]).includes(e?.status)) continue
      const t = typeof e.last_updated === 'string' && !Number.isNaN(Date.parse(e.last_updated)) ? new Date(e.last_updated).toISOString() : null
      if (!t) continue
      const types = new Set<string>()
      for (const c of Array.isArray(e.connectors) ? e.connectors : []) for (const name of STANDARD_TO_TYPE[c?.standard] ?? []) types.add(name)
      evses.push({ uid: e.uid, status: e.status, lastUpdated: t, connectorTypes: [...types] })
    }
    out.push({ id: loc.id, evses })
  }
  return out
}

/** One observation for the EVSEs at a location that offer `connectorType`; null when none match. */
export function groupObservation(loc: OcpiLocation, connectorType: string, retrievedAt: string): StatusObservation | null {
  const evses = loc.evses.filter((e) => e.connectorTypes.includes(connectorType) && !['PLANNED', 'REMOVED', 'UNKNOWN'].includes(e.status))
  if (!evses.length) return null
  const count = (s: string[]) => evses.filter((e) => s.includes(e.status)).length
  return {
    source: 'operator_feed',
    // The oldest EVSE time: the group is only as current as its stalest charger.
    observedAt: evses.map((e) => e.lastUpdated).sort()[0],
    retrievedAt,
    availableCount: count(['AVAILABLE']),
    outOfServiceCount: count(['INOPERATIVE', 'OUTOFORDER']),
    inUseCount: count(['CHARGING', 'BLOCKED', 'RESERVED']),
    supportsInUse: true,
  }
}
