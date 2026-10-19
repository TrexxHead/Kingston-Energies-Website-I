import { z } from 'zod'
import { JAMAICA_BOUNDS, PARISH_IDS, type ParishId } from './parishes'

/**
 * Station registry rules (backlog M03). A station is published only when it
 * has a verified source we're allowed to use, at least one connector group,
 * coordinates inside Jamaica and a valid parish. Drafts can be incomplete.
 */

export const ACCESS_VALUES = ['public', 'customers_only', 'restricted', 'private', 'unknown'] as const
export const STATION_STATUS = ['draft', 'published', 'closed', 'retired'] as const
export const SOURCE_TYPES = ['operator_agreement', 'operator_public', 'site_owner', 'field_visit', 'community', 'open_data', 'staff_list'] as const
export const COVERAGE_STATES = ['unreviewed', 'in_progress', 'reviewed_none_confirmed', 'reviewed_sites_confirmed'] as const

const optText = (max: number) => z.string().trim().max(max).nullable().optional()

export const connectorGroupSchema = z.object({
  connectorType: z.string().trim().min(1).max(40),
  currentType: z.enum(['AC', 'DC']),
  maxPowerKw: z.number().positive().max(1000).nullable().optional(),
  count: z.number().int().positive().max(100).nullable().optional(),
  portsShared: z.boolean().nullable().optional(),
  notes: optText(500),
})

export const stationInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  operatorName: optText(120),
  parish: z.enum(PARISH_IDS as [ParishId, ...ParishId[]]),
  address: optText(300),
  lat: z.number().min(JAMAICA_BOUNDS.south).max(JAMAICA_BOUNDS.north),
  lng: z.number().min(JAMAICA_BOUNDS.west).max(JAMAICA_BOUNDS.east),
  access: z.enum(ACCESS_VALUES),
  accessNotes: optText(1000),
  hours: optText(200),
  paymentNotes: optText(1000),
  pricingNotes: optText(1000),
  pricingObservedAt: z.string().datetime().nullable().optional(),
  googlePlaceId: optText(200),
  operatorLocationId: optText(120),
  verificationNote: optText(2000),
  connectorGroups: z.array(connectorGroupSchema).max(20),
})

export const sourceInputSchema = z.object({
  sourceName: z.string().trim().min(1).max(160),
  sourceType: z.enum(SOURCE_TYPES),
  licence: optText(300),
  permissionScope: optText(2000),
  url: z.string().url().max(1000).nullable().optional(),
  contact: optText(300),
  observedAt: z.string().datetime().nullable().optional(),
  notes: optText(2000),
})

export type StationInput = z.infer<typeof stationInputSchema>

export interface PublishCheckInput {
  parish: string
  lat: number
  lng: number
  connectorGroups: { connectorType: string }[]
  sources: { reviewState: string; expiresAt?: Date | string | null }[]
}

/** Reasons a station can't be published yet; empty means it can. */
export function publishBlockers(s: PublishCheckInput, now = new Date()): string[] {
  const out: string[] = []
  if (!(PARISH_IDS as string[]).includes(s.parish)) out.push('Choose a valid parish.')
  if (s.lat < JAMAICA_BOUNDS.south || s.lat > JAMAICA_BOUNDS.north || s.lng < JAMAICA_BOUNDS.west || s.lng > JAMAICA_BOUNDS.east) out.push('Coordinates are outside Jamaica.')
  if (!s.connectorGroups.length) out.push('Add at least one connector group.')
  const verified = s.sources.filter((x) => x.reviewState === 'verified' && (!x.expiresAt || new Date(x.expiresAt) > now))
  if (!verified.length) out.push('Record and verify at least one source we have permission to use.')
  return out
}

/** A verified source needs something a reviewer can check later: a link, or notes describing the evidence. */
export function sourceVerifiable(src: { url: string | null; notes: string | null; sourceType: string }): string | null {
  if (src.sourceType === 'community') return 'A community report is evidence to follow up, not a verified source. Visit or contact the site first.'
  if (!src.url && !(src.notes && src.notes.trim().length >= 10)) return 'Add a link or notes describing the evidence (who, when, what was checked) before verifying.'
  return null
}

/** How a Kingston Energies status check was made — recorded in the activity log with the check. */
export const CHECK_METHODS = ['site_visit', 'phone_call', 'operator_app', 'operator_confirmed', 'other'] as const
export const CHECK_STATES = ['working', 'out_of_service', 'unknown'] as const
export type CheckState = (typeof CHECK_STATES)[number]

export const statusCheckSchema = z.object({
  checks: z.array(z.object({ groupId: z.string().min(1), state: z.enum(CHECK_STATES) })).min(1).max(20),
  /** When the status was checked; defaults to now. Can't be in the future or more than 30 days back. */
  observedAt: z.string().datetime().nullable().optional(),
  method: z.enum(CHECK_METHODS),
  note: optText(1000),
})

/** Observation counts for a staff check. Unknown connector counts are recorded as 1, which the status logic reads as "all". */
export function checkObservation(state: CheckState, connectorCount: number | null) {
  const n = connectorCount && connectorCount > 0 ? connectorCount : 1
  if (state === 'working') return { availableCount: n, outOfServiceCount: 0 }
  if (state === 'out_of_service') return { availableCount: 0, outOfServiceCount: n }
  return { availableCount: null, outOfServiceCount: null }
}

export function checkTimeProblem(observedAt: Date, now = new Date()): string | null {
  if (Number.isNaN(observedAt.getTime())) return 'Invalid check time.'
  if (observedAt.getTime() > now.getTime() + 5 * 60_000) return 'The check time can’t be in the future.'
  if (now.getTime() - observedAt.getTime() > 30 * 24 * 60 * 60_000) return 'Checks older than 30 days would already be out of date.'
  return null
}
