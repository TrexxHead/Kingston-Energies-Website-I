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
  /** The operator's tariff ids on this EVSE's connectors (OCPI `tariff_ids`). */
  tariffIds: string[]
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
      const tariffs = new Set<string>()
      for (const c of Array.isArray(e.connectors) ? e.connectors : []) {
        for (const name of STANDARD_TO_TYPE[c?.standard] ?? []) types.add(name)
        for (const id of Array.isArray(c?.tariff_ids) ? c.tariff_ids : []) if (typeof id === 'string') tariffs.add(id)
      }
      evses.push({ uid: e.uid, status: e.status, lastUpdated: t, connectorTypes: [...types], tariffIds: [...tariffs] })
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

/** The tariff ids used by the EVSEs at a location offering `connectorType` (all types when omitted). */
export function locationTariffIds(loc: OcpiLocation, connectorType?: string): string[] {
  return [...new Set(loc.evses.filter((e) => !connectorType || e.connectorTypes.includes(connectorType)).flatMap((e) => e.tariffIds))]
}

// ─────────────────────────────────────────────────────────────────────────
// OCPI 2.2.1 Tariffs → our charging price shape. Only JMD tariffs are used.
// Prices in OCPI exclude VAT; when the tariff gives `vat` we add it (GCT),
// otherwise we say the price may exclude GCT. Elements restricted by
// anything other than time of day and weekday (power, kWh, duration,
// dates) can't be shown as a simple price, so they're left out and noted.

const OCPI_DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const UNSUPPORTED_RESTRICTIONS = ['start_date', 'end_date', 'min_kwh', 'max_kwh', 'min_current', 'max_current', 'min_power', 'max_power', 'min_duration', 'max_duration', 'reservation']

export interface OcpiChargingPrice {
  operator: string
  pricePerKwh: number | null
  periods?: { label: string; start: string; end: string; days?: number[]; pricePerKwh: number }[]
  sessionFee: number | null
  idleFeePerMin: number | null
  notes: string | null
}

export function parseOcpiTariffs(json: any, operator: string): Map<string, OcpiChargingPrice> {
  const out = new Map<string, OcpiChargingPrice>()
  const raw = Array.isArray(json?.data) ? json.data : json?.data && typeof json.data === 'object' ? [json.data] : []
  for (const t of raw) {
    if (typeof t?.id !== 'string' || t?.currency !== 'JMD' || !Array.isArray(t?.elements)) continue
    const notes = new Set<string>()
    let base: number | null = null
    let session: number | null = null
    let idle: number | null = null
    const bands: { start: string; end: string; days?: number[]; price: number }[] = []
    for (const el of t.elements) {
      const comps = Array.isArray(el?.price_components) ? el.price_components : []
      const r = el?.restrictions ?? {}
      if (UNSUPPORTED_RESTRICTIONS.some((k) => r[k] != null)) {
        notes.add('Some prices depend on charging power, energy or duration — see the operator’s app.')
        continue
      }
      const timed = typeof r.start_time === 'string' && typeof r.end_time === 'string'
      const days = Array.isArray(r.day_of_week) ? r.day_of_week.map((d: string) => OCPI_DAYS.indexOf(d)).filter((d: number) => d >= 0) : undefined
      for (const c of comps) {
        const price = Number(c?.price)
        if (!Number.isFinite(price) || price < 0) continue
        const withVat = typeof c?.vat === 'number' ? price * (1 + c.vat / 100) : price
        if (typeof c?.vat !== 'number') notes.add('Prices may exclude GCT.')
        const amount = Math.round(withVat * 100) / 100
        if (c.type === 'ENERGY') {
          if (timed || days?.length) bands.push({ start: timed ? r.start_time : '00:00', end: timed ? r.end_time : '00:00', ...(days?.length ? { days } : {}), price: amount })
          else if (base == null) base = amount
        } else if (c.type === 'FLAT' && !timed && session == null) session = amount
        else if (c.type === 'PARKING_TIME' && !timed && idle == null) idle = Math.round((withVat / 60) * 100) / 100
        else if (c.type === 'TIME') notes.add(`Plus J$${amount.toLocaleString('en-JM')} an hour while charging${timed ? ' at some times' : ''}.`)
        else if (timed) notes.add('Some fees change by time of day — see the operator’s app.')
      }
    }
    const periods = bands.map((b) => ({ label: base == null ? 'Time band' : b.price > base ? 'Peak' : b.price < base ? 'Off-peak' : 'Time band', start: b.start, end: b.end, ...(b.days ? { days: b.days } : {}), pricePerKwh: b.price }))
    out.set(t.id, { operator, pricePerKwh: base, ...(periods.length ? { periods: periods.slice(0, 8) } : {}), sessionFee: session, idleFeePerMin: idle, notes: notes.size ? [...notes].join(' ') : null })
  }
  return out
}
