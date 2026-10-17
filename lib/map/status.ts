/**
 * Jamaica Energy Map — charging status and freshness (backlog M05).
 *
 * "Open now" is not "available now", and a page refresh doesn't make a
 * status new. Status is derived per CONNECTOR GROUP from timestamped
 * observations, each carrying the provider's own observation time
 * (observedAt) separately from when we fetched it (retrievedAt). A missing
 * observation time stays missing; a missing availability count is never
 * read as zero, available or closed.
 */

export type StatusSource = 'operator_feed' | 'google_places' | 'site_owner' | 'staff_check' | 'community'

/**
 * Three public states (owner decision, 14 Oct 2026):
 *  - available: an operator feed or a Kingston Energies check confirms it
 *    working within the freshness window. It means "working", not that a
 *    port is free this minute — the detail line says who confirmed it, when.
 *  - out_of_service: confirmed not working within the window.
 *  - status_unknown: everything else, including stale confirmations,
 *    community reports and "in use" (occupied ≠ broken, but not free).
 */
export type DisplayState = 'available' | 'status_unknown' | 'out_of_service'

export const DISPLAY_STATES: DisplayState[] = ['available', 'status_unknown', 'out_of_service']

export const DISPLAY_LABEL: Record<DisplayState, string> = {
  available: 'Available',
  status_unknown: 'Status unknown',
  out_of_service: 'Out of service',
}

/** Icon names (lucide) so state is never communicated by colour alone. */
export const DISPLAY_ICON: Record<DisplayState, string> = {
  available: 'circle-check',
  status_unknown: 'circle-help',
  out_of_service: 'circle-x',
}

export interface StatusObservation {
  source: StatusSource
  /** Provider's own time for this status. null when the provider didn't supply one. */
  observedAt: string | null
  /** When our system fetched/received it. Never substituted for observedAt. */
  retrievedAt: string
  /** null = field absent from the source (unknown), 0 = reported zero. */
  availableCount: number | null
  outOfServiceCount: number | null
  /** Only set when the source explicitly reports occupancy. */
  inUseCount: number | null
  /** Whether this source's schema can express "in use" at all. */
  supportsInUse: boolean
}

export interface CommunitySignal {
  kind: 'successful_charge' | 'equipment_fault' | 'access_blocked' | 'connector_missing' | 'could_not_find'
  observedAt: string
  moderation: 'pending' | 'approved' | 'rejected'
}

/**
 * Freshness windows per source — ENGINEERING POLICY to validate against each
 * provider's agreement and observed update cadence, not a claim about any
 * operator's service level.
 */
export const FRESHNESS_MS: Record<StatusSource, number> = {
  operator_feed: 5 * 60_000,
  google_places: 15 * 60_000,
  site_owner: 24 * 60 * 60_000,
  // A Kingston Energies check (site visit, call, operator app) stays current for a week…
  staff_check: 7 * 24 * 60 * 60_000,
  community: 14 * 24 * 60 * 60_000,
}

/** …and a confirmed fault for 30 days, unless someone re-checks sooner. */
export const OUT_OF_SERVICE_FRESHNESS_MS = 30 * 24 * 60 * 60_000

const SOURCE_TEXT: Record<StatusSource, string> = {
  operator_feed: 'the operator',
  google_places: 'Google',
  site_owner: 'the site owner',
  staff_check: 'Kingston Energies',
  community: 'a driver',
}

export interface GroupStatus {
  state: DisplayState
  detail: string
  source: StatusSource | null
  observedAt: string | null
  retrievedAt: string | null
}

const AUTHORITATIVE: StatusSource[] = ['operator_feed', 'google_places', 'site_owner', 'staff_check']

function ageText(ms: number): string {
  const m = Math.round(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}

/**
 * Derive the display status for one connector group of `connectorCount`
 * connectors (null when the count is unknown; connectors may share ports —
 * this does not imply simultaneous charging capacity).
 */
export function deriveGroupStatus(
  connectorCount: number | null,
  observations: StatusObservation[],
  community: CommunitySignal[],
  now: Date,
  freshness: Record<StatusSource, number> = FRESHNESS_MS,
): GroupStatus {
  const authoritative = observations
    .filter((o) => AUTHORITATIVE.includes(o.source))
    .sort((a, b) => Date.parse(b.observedAt ?? '') - Date.parse(a.observedAt ?? '') || Date.parse(b.retrievedAt) - Date.parse(a.retrievedAt))
  const timed = authoritative.filter((o) => o.observedAt)
  const latest = timed[0]

  const unknown = (detail: string, extra: Partial<GroupStatus> = {}): GroupStatus => ({
    state: 'status_unknown',
    detail,
    source: null,
    observedAt: null,
    retrievedAt: null,
    ...extra,
  })

  // A moderated "charged here" report is a useful hint, never a confirmation.
  const communityHint = (): string | null => {
    const working = community
      .filter((c) => c.moderation === 'approved' && c.kind === 'successful_charge')
      .filter((c) => now.getTime() - Date.parse(c.observedAt) <= freshness.community)
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0]
    return working ? `A driver reported a successful charge ${ageText(now.getTime() - Date.parse(working.observedAt))}.` : null
  }

  if (!latest) {
    const hint = communityHint()
    if (authoritative.length) return unknown('A status was received without an observation time, so it cannot be shown as current.', { retrievedAt: authoritative[0].retrievedAt })
    return unknown(hint ?? 'Not yet confirmed. No live status feed for this charger.')
  }

  const age = now.getTime() - Date.parse(latest.observedAt as string)
  const when = ageText(age)
  const who = SOURCE_TEXT[latest.source]
  const base = { source: latest.source, observedAt: latest.observedAt, retrievedAt: latest.retrievedAt }
  const count = connectorCount && connectorCount > 0 ? connectorCount : null

  const allOut =
    latest.outOfServiceCount != null && latest.outOfServiceCount > 0 && (count != null ? latest.outOfServiceCount >= count : latest.availableCount === 0 || latest.availableCount == null)
  if (allOut) {
    const window = latest.source === 'staff_check' ? OUT_OF_SERVICE_FRESHNESS_MS : freshness[latest.source]
    if (age > window) return unknown(`Reported out of service by ${who} ${when}; not re-checked since.`, base)
    return { ...base, state: 'out_of_service', detail: `Confirmed out of service by ${who} ${when}.` }
  }

  if (age > freshness[latest.source]) {
    const was = latest.availableCount != null && latest.availableCount > 0 ? `Last confirmed working by ${who} ${when}.` : `Last status from ${who} was ${when}.`
    return unknown([was, communityHint()].filter(Boolean).join(' '), base)
  }

  if (latest.availableCount != null && latest.availableCount > 0) {
    const detail =
      latest.source === 'staff_check'
        ? `Confirmed working by ${who} ${when}.`
        : count != null
          ? `${latest.availableCount} of ${count} connector(s) reported available by ${who} (${when}).`
          : `Reported available by ${who} (${when}).`
    return { ...base, state: 'available', detail }
  }
  if (latest.supportsInUse && latest.inUseCount != null && latest.inUseCount > 0) {
    return unknown(`${who[0].toUpperCase()}${who.slice(1)} reports ${latest.inUseCount} connector(s) in use (${when}).`, base)
  }
  if (latest.availableCount === 0) {
    return unknown(`${who[0].toUpperCase()}${who.slice(1)} reports 0${count != null ? ` of ${count}` : ''} available (${when}) but not whether they are in use or faulty.`, base)
  }
  return unknown(latest.source === 'staff_check' ? `Status cleared by Kingston Energies ${when}.` : `${who[0].toUpperCase()}${who.slice(1)} did not report availability for this connector group.`, base)
}

export interface ConnectorGroupSummary {
  connectorType: string
  status: GroupStatus
}

/**
 * Station-level wording names the connector group the status is for —
 * never implies every charger at the site is ready.
 */
export function stationStatusSummary(groups: ConnectorGroupSummary[]): string {
  const available = groups.filter((g) => g.status.state === 'available')
  if (available.length === groups.length && groups.length) return 'Available'
  if (available.length) return `Available: ${available.map((g) => g.connectorType).join(', ')}`
  if (groups.length && groups.every((g) => g.status.state === 'out_of_service')) return 'Out of service'
  const out = groups.filter((g) => g.status.state === 'out_of_service')
  if (out.length) return `Out of service: ${out.map((g) => g.connectorType).join(', ')}`
  return 'Status unknown'
}
