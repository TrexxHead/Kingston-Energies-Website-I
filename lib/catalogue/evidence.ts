import type { EvidenceBasis } from '@/lib/energy/engine/basis'

/**
 * Verified product catalogue — specification evidence (backlog F05).
 *
 * Every spec value for an exact regional SKU is an evidence record with a
 * source and a review state. "Unknown" is a valid state. A recommendation
 * may only be published when every CRITICAL field for the product kind is
 * verified and unexpired; a listing claim (what the storefront or a supplier
 * page says) is never treated as verified.
 */

export type ProductKind = 'power_station' | 'power_bank' | 'solar_panel' | 'charger' | 'cable' | 'accessory'

export type EvidenceSourceType = 'manufacturer_doc' | 'test_record' | 'label_photo' | 'supplier_doc' | 'listing_claim'

export type ReviewState = 'unverified' | 'verified' | 'rejected' | 'superseded'

export interface SpecFieldDef {
  key: string
  label: string
  unit?: string
  type: 'number' | 'text'
  critical: boolean
  help?: string
}

const WARRANTY: SpecFieldDef = { key: 'local_warranty', label: 'Local warranty terms', type: 'text', critical: true }
const MODEL: SpecFieldDef = { key: 'manufacturer_model', label: 'Exact manufacturer model number', type: 'text', critical: true }
const REGION: SpecFieldDef = { key: 'region_variant', label: 'Regional variant', type: 'text', critical: false, help: 'e.g. US 120 V model' }

export const SPEC_FIELDS: Record<ProductKind, SpecFieldDef[]> = {
  power_station: [
    MODEL,
    REGION,
    { key: 'battery_energy_wh', label: 'Battery energy', unit: 'Wh', type: 'number', critical: true },
    { key: 'battery_energy_basis', label: 'Battery energy basis', type: 'text', critical: true, help: 'nominal | usable_dc | delivered_ac_measured' },
    { key: 'ac_continuous_w', label: 'AC continuous output', unit: 'W', type: 'number', critical: true },
    { key: 'ac_surge_w', label: 'AC surge output', unit: 'W', type: 'number', critical: true },
    { key: 'ac_surge_duration_ms', label: 'Surge duration', unit: 'ms', type: 'number', critical: false },
    { key: 'ac_output_voltage_v', label: 'AC output voltage', unit: 'V', type: 'number', critical: true },
    { key: 'ac_output_frequency_hz', label: 'AC output frequency', type: 'text', critical: true, help: '50 | 60 | 50/60' },
    { key: 'ac_waveform', label: 'AC waveform', type: 'text', critical: true, help: 'pure_sine | modified_sine' },
    { key: 'ac_outlets', label: 'AC outlet types and count', type: 'text', critical: false },
    { key: 'inverter_efficiency', label: 'Inverter efficiency', type: 'number', critical: false, help: 'fraction, e.g. 0.88' },
    { key: 'idle_w', label: 'Inverter idle consumption', unit: 'W', type: 'number', critical: false },
    { key: 'usb_c_max_w', label: 'USB-C max output', unit: 'W', type: 'number', critical: false },
    { key: 'ups_switchover_ms', label: 'UPS / transfer switchover time', unit: 'ms', type: 'number', critical: false },
    { key: 'ac_charge_input_w', label: 'AC charging input', unit: 'W', type: 'number', critical: false },
    { key: 'solar_input', label: 'Solar input limits (V, A, W)', type: 'text', critical: false },
    { key: 'supplied_cables', label: 'Supplied cables', type: 'text', critical: false },
    WARRANTY,
  ],
  power_bank: [
    MODEL,
    REGION,
    { key: 'capacity_mah', label: 'Cell capacity', unit: 'mAh', type: 'number', critical: true },
    { key: 'cell_voltage_v', label: 'Voltage the mAh is rated at', unit: 'V', type: 'number', critical: true },
    { key: 'battery_energy_wh', label: 'Battery energy', unit: 'Wh', type: 'number', critical: false },
    { key: 'usb_c_max_w', label: 'USB-C max output', unit: 'W', type: 'number', critical: true },
    { key: 'usb_pd_profiles', label: 'USB PD / PPS profiles', type: 'text', critical: false },
    { key: 'ports', label: 'Ports', type: 'text', critical: true },
    { key: 'wireless_w', label: 'Wireless output', unit: 'W', type: 'number', critical: false },
    { key: 'supplied_cables', label: 'Supplied cables', type: 'text', critical: false },
    WARRANTY,
  ],
  solar_panel: [
    MODEL,
    { key: 'rated_power_w', label: 'Rated power (STC)', unit: 'W', type: 'number', critical: true },
    { key: 'open_circuit_voltage_v', label: 'Open-circuit voltage', unit: 'V', type: 'number', critical: true },
    { key: 'short_circuit_current_a', label: 'Short-circuit current', unit: 'A', type: 'number', critical: true },
    { key: 'output_connector', label: 'Output connector', type: 'text', critical: true },
    { key: 'usb_outputs', label: 'Direct USB outputs', type: 'text', critical: false },
    WARRANTY,
  ],
  charger: [
    MODEL,
    { key: 'max_output_w', label: 'Max output', unit: 'W', type: 'number', critical: true },
    { key: 'usb_pd_profiles', label: 'USB PD / PPS profiles', type: 'text', critical: true },
    { key: 'input_voltage_range', label: 'Input voltage / frequency range', type: 'text', critical: true },
    { key: 'ports', label: 'Ports', type: 'text', critical: true },
    WARRANTY,
  ],
  cable: [
    { key: 'connector_a', label: 'Connector A', type: 'text', critical: true },
    { key: 'connector_b', label: 'Connector B', type: 'text', critical: true },
    { key: 'max_power_w', label: 'Rated power / current', unit: 'W', type: 'number', critical: true },
    { key: 'length_m', label: 'Length', unit: 'm', type: 'number', critical: false },
    { key: 'data_rating', label: 'Data rating', type: 'text', critical: false },
  ],
  accessory: [MODEL],
}

export interface EvidenceRecord {
  id: string
  field: string
  valueNum: number | null
  valueText: string | null
  unit: string | null
  sourceType: EvidenceSourceType
  sourceUrl: string | null
  reviewState: ReviewState
  verifiedAt: string | null
  expiresAt: string | null
}

export type FieldState = 'verified' | 'claimed' | 'expired' | 'conflicting' | 'unknown'

export interface ResolvedField {
  field: string
  state: FieldState
  valueNum: number | null
  valueText: string | null
  evidenceIds: string[]
  sourceType: EvidenceSourceType | null
}

function sameValue(a: EvidenceRecord, b: EvidenceRecord): boolean {
  return a.valueNum === b.valueNum && (a.valueText ?? '').trim().toLowerCase() === (b.valueText ?? '').trim().toLowerCase()
}

/**
 * Resolve one field from its evidence. Verified and unexpired wins; two
 * verified records that disagree are a conflict (shown, not averaged); an
 * expired verification is reported as expired, not silently trusted.
 */
export function resolveField(field: string, evidence: EvidenceRecord[], now: Date): ResolvedField {
  const live = evidence.filter((e) => e.field === field && e.reviewState !== 'rejected' && e.reviewState !== 'superseded')
  const empty: ResolvedField = { field, state: 'unknown', valueNum: null, valueText: null, evidenceIds: [], sourceType: null }
  if (!live.length) return empty

  const verified = live.filter((e) => e.reviewState === 'verified' && e.sourceType !== 'listing_claim')
  const current = verified.filter((e) => !e.expiresAt || new Date(e.expiresAt) > now)
  if (current.length) {
    const first = current[0]
    if (current.some((e) => !sameValue(e, first))) {
      return { ...empty, state: 'conflicting', evidenceIds: current.map((e) => e.id) }
    }
    return { field, state: 'verified', valueNum: first.valueNum, valueText: first.valueText, evidenceIds: current.map((e) => e.id), sourceType: first.sourceType }
  }
  if (verified.length) {
    const last = verified[verified.length - 1]
    return { field, state: 'expired', valueNum: last.valueNum, valueText: last.valueText, evidenceIds: [last.id], sourceType: last.sourceType }
  }
  const claim = live[live.length - 1]
  return { field, state: 'claimed', valueNum: claim.valueNum, valueText: claim.valueText, evidenceIds: [claim.id], sourceType: claim.sourceType }
}

export function resolveAll(kind: ProductKind, evidence: EvidenceRecord[], now: Date): Record<string, ResolvedField> {
  const out: Record<string, ResolvedField> = {}
  for (const f of SPEC_FIELDS[kind]) out[f.key] = resolveField(f.key, evidence, now)
  return out
}

export interface Readiness {
  publishable: boolean
  blocking: { field: string; label: string; state: FieldState }[]
  verifiedCritical: number
  totalCritical: number
}

/** A SKU may back a published recommendation only when every critical field is verified and current. */
export function skuReadiness(kind: ProductKind, evidence: EvidenceRecord[], now: Date): Readiness {
  const resolved = resolveAll(kind, evidence, now)
  const critical = SPEC_FIELDS[kind].filter((f) => f.critical)
  const blocking = critical.filter((f) => resolved[f.key].state !== 'verified').map((f) => ({ field: f.key, label: f.label, state: resolved[f.key].state }))
  return { publishable: blocking.length === 0, blocking, verifiedCritical: critical.length - blocking.length, totalCritical: critical.length }
}

/** Engine evidence basis for a resolved field. Claims count as customer-entered quality at best. */
export function basisFor(r: ResolvedField): EvidenceBasis {
  if (r.state !== 'verified') return 'assumed'
  if (r.sourceType === 'test_record') return 'measured'
  if (r.sourceType === 'manufacturer_doc' || r.sourceType === 'label_photo') return 'manufacturer'
  return 'customer_entered'
}

export function mapCategoryToKind(cat: string): ProductKind {
  switch (cat) {
    case 'powerbanks':
      return 'power_bank'
    case 'chargers':
      return 'charger'
    case 'components':
      return 'cable'
    case 'stations':
      return 'power_station'
    default:
      return 'accessory'
  }
}
