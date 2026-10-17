import { PARISHES, type ParishId } from './parishes'
import { stationInputSchema, type StationInput } from './registry'

/**
 * Turns an owner-supplied station list (lib/map/data/station-list-*.json)
 * into registry inputs. Rules:
 *  - Only facts from the list are used; nothing is filled in. Missing
 *    connectors, hours or access stay unknown.
 *  - Entries with connector details can be published; the rest become
 *    drafts for an admin to complete (the registry needs a connector group).
 *  - Entries within 300 m of another are flagged as possible duplicates.
 *  - Google ratings/reviews are not part of the list and are never stored.
 */

export interface ListConnector {
  type: string
  current: 'AC' | 'DC'
  kw: number | null
  count: number | null
}

export interface ListStation {
  ref: number
  name: string
  operator: string | null
  address: string | null
  lat: number
  lng: number
  parish: string
  connectors: ListConnector[]
  hours: string | null
  phone: string | null
  website: string | null
  nearby: { ref: number; metres: number }[]
}

export interface StationList {
  list: string
  listDate: string
  note: string
  stations: ListStation[]
}

export interface PlannedStation {
  ref: number
  input: StationInput
  publish: boolean
  source: { sourceName: string; url: string | null; contact: string | null; notes: string }
  warnings: string[]
}

/** Known operator websites (for the operator record only). */
export const OPERATOR_SITES: Record<string, string> = {
  "JPS Charge 'n Go": 'https://www.jpsco.com/chargengo/',
  Evergo: 'https://evergo.com/',
  'Porsche Destination Charging': 'https://porsche.com/destinationcharging',
}

/** Map list connector names onto the admin vocabulary (J1772 is Type 1; CCS stays unspecified). */
const CONNECTOR_NAME: Record<string, string> = { J1772: 'J1772 (Type 1)' }

const GENERIC_NAME = /^(electric vehicle charging station|evergo charging station|jps charge 'n go charging station|jps charging station|chargengo charging station|porsche destination charging)$/i
const PLUS_CODE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i

/** The town/area part of an address ("…, Ocho Rios" → "Ocho Rios"); null when there isn't one. */
export function localityOf(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  const last = parts[parts.length - 1]
  if (!last || parts.length < 2) return null
  return last.replace(/^na\s+/i, '') || null
}

/** Street part worth showing next to a generic name (skips plus codes and shop numbers). */
function streetOf(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(',').map((p) => p.trim())
  const street = parts.slice(0, -1).find((p) => p && !PLUS_CODE.test(p) && !/^shop#?/i.test(p))
  return street ?? null
}

/**
 * Generic listing names ("Evergo Charging Station" × 15) are told apart by
 * place — derived from the listed address, never invented.
 */
export function displayName(s: ListStation): string {
  if (!GENERIC_NAME.test(s.name.trim())) return s.name.trim()
  const brand = s.operator ?? 'EV charging'
  const where = [streetOf(s.address), localityOf(s.address) ?? PARISHES.find((p) => p.id === s.parish)?.name].filter(Boolean).join(', ')
  return where ? `${brand} · ${where}` : brand
}

export function sourceNameFor(list: StationList): string {
  return `${list.list} (${list.listDate})`
}

export function entryTag(ref: number): string {
  return `List entry #${ref}.`
}

export function planStationImport(list: StationList): PlannedStation[] {
  return list.stations.map((s) => {
    const warnings: string[] = []
    if (!s.connectors.length) warnings.push('No connector details in the list — kept as a draft.')
    if (s.nearby.length) warnings.push(`Within 300 m of list ${s.nearby.map((n) => `#${n.ref} (${n.metres} m)`).join(', ')} — check whether these are the same site.`)
    if (!localityOf(s.address)) warnings.push('Address has no town — confirm the location.')

    const raw: StationInput = {
      name: displayName(s).slice(0, 120),
      operatorName: s.operator,
      parish: s.parish as ParishId,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      access: 'unknown',
      accessNotes: null,
      hours: s.hours,
      paymentNotes: null,
      pricingNotes: null,
      pricingObservedAt: null,
      googlePlaceId: null,
      verificationNote: [`${entryTag(s.ref)} Listed as “${s.name}”.`, list.note, ...warnings].join(' '),
      connectorGroups: s.connectors.map((c) => ({ connectorType: CONNECTOR_NAME[c.type] ?? c.type, currentType: c.current, maxPowerKw: c.kw, count: c.count, portsShared: null, notes: null })),
    }
    const input = stationInputSchema.parse(raw)
    return {
      ref: s.ref,
      input,
      publish: s.connectors.length > 0,
      source: {
        sourceName: sourceNameFor(list),
        url: s.website,
        contact: s.phone,
        notes: `${entryTag(s.ref)} ${list.note}`,
      },
      warnings,
    }
  })
}
