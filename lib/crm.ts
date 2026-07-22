/**
 * CRM taxonomy — the single source of truth for the IDIC model (Peppers & Rogers)
 * as applied to Kingston Energies. Kept framework-agnostic of the UI so the same
 * definitions drive signup, the customer Hub, the admin CRM section, and seeding.
 *
 * IDIC stage supported here so far:
 *   Identify — capture who the customer is, including their PRIMARY NEED (the
 *   use-case their portable-power purchase serves). Needs-based data is what the
 *   "Differentiate" stage later segments on, alongside customer value.
 */

/** The use-case a customer's portable-power purchase primarily serves. */
export type CustomerNeed = 'EVERYDAY' | 'BACKUP' | 'OFFGRID' | 'BUSINESS'

export interface CustomerNeedOption {
  id: CustomerNeed
  label: string
  detail: string
}

/**
 * Needs are ordered from lightest to heaviest power requirement. This is the
 * list rendered in the signup and profile pickers and used to label customers
 * in the admin CRM view.
 */
export const CUSTOMER_NEEDS: CustomerNeedOption[] = [
  { id: 'EVERYDAY', label: 'Everyday carry', detail: 'Keeping phones and small devices topped up on the go' },
  { id: 'BACKUP', label: 'Home backup', detail: 'Staying powered through outages at home' },
  { id: 'OFFGRID', label: 'Off-grid', detail: 'Power away from the grid — rural, camping, field work' },
  { id: 'BUSINESS', label: 'Small business', detail: 'Keeping a shop, stall or work site running' },
]

const NEED_BY_ID = new Map(CUSTOMER_NEEDS.map((n) => [n.id, n]))

/** True if the given string is a valid CustomerNeed id. */
export function isCustomerNeed(value: unknown): value is CustomerNeed {
  return typeof value === 'string' && NEED_BY_ID.has(value as CustomerNeed)
}

/** Human-readable label for a stored need, or a dash when none is set. */
export function customerNeedLabel(need: string | null | undefined): string {
  if (!need) return '—'
  return NEED_BY_ID.get(need as CustomerNeed)?.label ?? '—'
}

/* ------------------------------------------------------------------ *
 * IDIC "Differentiate" — value-based segmentation
 *
 * The Session 7 material ("The Value of Customers") differentiates customers
 * on two axes — their Actual Value (what they're worth now) and their Growth
 * Potential — producing five tiers. We derive the tier from order history so
 * the admin CRM can prioritise treatment strategies per Peppers & Rogers.
 * ------------------------------------------------------------------ */

export type ValueTier = 'MVC' | 'SGC' | 'MGC' | 'LMC' | 'BZC'

export interface ValueTierMeta {
  id: ValueTier
  label: string
  /** The recommended treatment strategy from the course material. */
  strategy: string
  tone: 'green' | 'blue' | 'orange' | 'red' | 'grey'
}

export const VALUE_TIERS: Record<ValueTier, ValueTierMeta> = {
  MVC: { id: 'MVC', label: 'Most Valuable', strategy: 'Retain — protect with loyalty perks and priority service', tone: 'green' },
  SGC: { id: 'SGC', label: 'Super-Growth', strategy: 'Retain and mine — high value and still growing', tone: 'blue' },
  MGC: { id: 'MGC', label: 'Most Growable', strategy: 'Grow — invest to capture more of their spend', tone: 'orange' },
  LMC: { id: 'LMC', label: 'Low Maintenance', strategy: 'Automate — serve efficiently via self-service', tone: 'grey' },
  BZC: { id: 'BZC', label: 'Below Zero', strategy: 'Deprioritise — costs more to serve than it returns', tone: 'red' },
}

/**
 * Tunable thresholds for the two axes. JMD figures, tuned to the current
 * catalog (products roughly J$2,500–J$80,000). Adjust as real data lands.
 */
export const VALUE_TIER_CONFIG = {
  /** LTV at/above which a customer counts as high Actual Value. */
  highValueLtv: 20_000,
  /** A customer who ordered within this many months is treated as "active"
   *  (a proxy for Growth Potential — still engaged, room to grow). */
  activeMonths: 6,
} as const

export interface CustomerValueInputs {
  /** Lifetime value = sum of the customer's order totals (JMD). */
  ltv: number
  /** Number of orders placed. */
  orderCount: number
  /** Months since the most recent order; null when they've never ordered. */
  monthsSinceLastOrder: number | null
  /** Currently open support tickets (used to spot below-zero customers). */
  openTickets?: number
}

/**
 * Classify a customer into one of the five value tiers from the material.
 * Below-Zero is approximated (we don't track true cost-to-serve): a contact
 * generating no revenue while consuming support is treated as below zero.
 */
export function customerValueTier(input: CustomerValueInputs): ValueTier {
  const { ltv, orderCount, monthsSinceLastOrder, openTickets = 0 } = input

  // No revenue but actively consuming support → costs more than it returns.
  if (ltv <= 0 && openTickets >= 2) return 'BZC'

  const highValue = ltv >= VALUE_TIER_CONFIG.highValueLtv
  const active =
    orderCount > 0 &&
    monthsSinceLastOrder !== null &&
    monthsSinceLastOrder <= VALUE_TIER_CONFIG.activeMonths

  if (highValue) return active ? 'SGC' : 'MVC'
  return active ? 'MGC' : 'LMC'
}

/** Months between a past date and now (0 when the date is in the future). */
export function monthsSince(date: Date | string | null | undefined, now: Date = new Date()): number | null {
  if (!date) return null
  const then = typeof date === 'string' ? new Date(date) : date
  const ms = now.getTime() - then.getTime()
  if (ms < 0) return 0
  return ms / (1000 * 60 * 60 * 24 * 30.44)
}
