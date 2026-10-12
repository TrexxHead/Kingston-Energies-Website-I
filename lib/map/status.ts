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

export type StatusSource = 'operator_feed' | 'google_places' | 'site_owner' | 'community'

export type DisplayState =
  | 'available_now'
  | 'in_use'
  | 'out_of_service'
  | 'recently_reported_working'
  | 'status_unavailable'
  | 'status_may_be_outdated'

export const DISPLAY_LABEL: Record<DisplayState, string> = {
  available_now: 'Available now',
  in_use: 'In use',
  out_of_service: 'Out of service',
  recently_reported_working: 'Recently reported working',
  status_unavailable: 'Status unavailable',
  status_may_be_outdated: 'Status may be outdated',
}

/** Icon names (lucide) so state is never communicated by colour alone. */
export const DISPLAY_ICON: Record<DisplayState, string> = {
  available_now: 'circle-check',
  in_use: 'clock',
  out_of_service: 'circle-x',
  recently_reported_working: 'message-circle',
  status_unavailable: 'circle-help',
  status_may_be_outdated: 'history',
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
  community: 14 * 24 * 60 * 60_000,
}

export interface GroupStatus {
  state: DisplayState
  detail: string
  source: StatusSource | null
  observedAt: string | null
  retrievedAt: string | null
}

const AUTHORITATIVE: StatusSource[] = ['operator_feed', 'google_places', 'site_owner']

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
 * connectors (which may share ports — this does not imply simultaneous
 * charging capacity).
 */
export function deriveGroupStatus(
  connectorCount: number,
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

  const communityFallback = (): GroupStatus | null => {
    const working = community
      .filter((c) => c.moderation === 'approved' && c.kind === 'successful_charge')
      .filter((c) => now.getTime() - Date.parse(c.observedAt) <= freshness.community)
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0]
    if (!working) return null
    return {
      state: 'recently_reported_working',
      detail: `A driver reported a successful charge ${ageText(now.getTime() - Date.parse(working.observedAt))}. This is a community report, not live equipment status.`,
      source: 'community',
      observedAt: working.observedAt,
      retrievedAt: null,
    }
  }

  if (!latest) {
    const c = communityFallback()
    if (c) return c
    const untimed = authoritative.length > 0
    return {
      state: 'status_unavailable',
      detail: untimed ? 'The provider returned a status without an observation time, so it cannot be shown as current.' : 'No supported live status for this charger.',
      source: null,
      observedAt: null,
      retrievedAt: authoritative[0]?.retrievedAt ?? null,
    }
  }

  const age = now.getTime() - Date.parse(latest.observedAt as string)
  const base = { source: latest.source, observedAt: latest.observedAt, retrievedAt: latest.retrievedAt }
  if (age > freshness[latest.source]) {
    const c = communityFallback()
    if (c) return c
    return { ...base, state: 'status_may_be_outdated', detail: `Last provider status was observed ${ageText(age)}.` }
  }

  const when = ageText(age)
  if (latest.outOfServiceCount != null && connectorCount > 0 && latest.outOfServiceCount >= connectorCount) {
    return { ...base, state: 'out_of_service', detail: `Provider reports all ${connectorCount} connector(s) out of service (${when}).` }
  }
  if (latest.availableCount != null && latest.availableCount > 0) {
    return { ...base, state: 'available_now', detail: `${latest.availableCount} of ${connectorCount} connector(s) reported available (${when}).` }
  }
  if (latest.supportsInUse && latest.inUseCount != null && latest.inUseCount > 0) {
    return { ...base, state: 'in_use', detail: `Provider reports ${latest.inUseCount} connector(s) in use (${when}).` }
  }
  if (latest.availableCount === 0) {
    return { ...base, state: 'status_unavailable', detail: `Provider reports 0 of ${connectorCount} available (${when}) but does not say whether they are in use or faulty.` }
  }
  return { ...base, state: 'status_unavailable', detail: 'The provider did not report availability for this connector group.' }
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
  const available = groups.filter((g) => g.status.state === 'available_now')
  if (available.length) return `Availability reported for ${available.map((g) => g.connectorType).join(', ')}`
  if (groups.length && groups.every((g) => g.status.state === 'out_of_service')) return 'All reported connector groups out of service'
  if (groups.some((g) => g.status.state === 'status_may_be_outdated')) return 'Status may be outdated'
  if (groups.some((g) => g.status.state === 'recently_reported_working')) return 'Recently reported working'
  return 'Status unavailable'
}
