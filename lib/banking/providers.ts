import type { ParsedLine } from './parse'

/**
 * Live bank feed adapters.
 *
 * Nothing is registered here, and that is the accurate state of things: a live
 * feed needs a commercial agreement with a bank or an aggregator, credentials,
 * and in Jamaica usually an on-site onboarding process. None of that exists
 * yet.
 *
 * What this file does is fix the shape a provider must satisfy, so adding one
 * later is a matter of writing an adapter rather than reworking the import
 * pipeline, the statement-line table and the reconciliation screen. The file
 * import path already produces exactly this output, which is what keeps the
 * two honest.
 */

export interface FetchWindow {
  since: Date
  until: Date
}

export interface BankFeedAdapter {
  /** Stable key stored on the connection. */
  key: string
  label: string
  /** Whether the environment actually has what this adapter needs to run. */
  isConfigured(): boolean
  /**
   * Pull statement lines for a window. Must return the same shape the file
   * parser produces, including a stable fingerprint, so imports de-duplicate
   * across sources.
   */
  fetchTransactions(externalAccountId: string, window: FetchWindow): Promise<ParsedLine[]>
}

const ADAPTERS = new Map<string, BankFeedAdapter>()

export function registerAdapter(adapter: BankFeedAdapter): void {
  ADAPTERS.set(adapter.key, adapter)
}

export function getAdapter(key: string): BankFeedAdapter | null {
  return ADAPTERS.get(key) ?? null
}

/** Adapters that are both registered and actually usable right now. */
export function availableAdapters(): BankFeedAdapter[] {
  return [...ADAPTERS.values()].filter((a) => a.isConfigured())
}

/**
 * What the UI should tell the user about live feeds. Kept here so the message
 * is derived from the real state of the registry rather than hardcoded in a
 * component that could drift out of date once an adapter is added.
 */
export function liveFeedStatus(): { available: boolean; providers: string[]; message: string } {
  const usable = availableAdapters()
  if (usable.length > 0) {
    return {
      available: true,
      providers: usable.map((a) => a.label),
      message: 'Connect an account to pull transactions automatically.',
    }
  }
  return {
    available: false,
    providers: [],
    message:
      'No live bank feed is connected. Automatic feeds need an agreement with your bank or an aggregator; until one is in place, import a CSV or OFX statement from online banking, and the result is identical once imported.',
  }
}
