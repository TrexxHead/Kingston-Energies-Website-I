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

/* ------------------------------------------------------------------ *
 * IDIC "Interact" — Net Promoter Score
 *
 * From the Session 7 material: on a 0–10 scale, 9–10 are Promoters, 7–8
 * Passives, 0–6 Detractors, and NPS = %Promoters − %Detractors (Passives
 * excluded from the calculation). We collect a score after each order and
 * after a Jordyn support interaction, then report the rolled-up figure.
 * ------------------------------------------------------------------ */

export type NpsBucket = 'promoter' | 'passive' | 'detractor'

/** Where an NPS response was collected. */
export type NpsSource = 'ORDER' | 'SUPPORT'

/** Bucket a single 0–10 score. */
export function npsBucket(score: number): NpsBucket {
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

export interface NpsSummary {
  /** −100..100, rounded; 0 when there are no responses. */
  score: number
  promoters: number
  passives: number
  detractors: number
  total: number
}

/** Roll a set of 0–10 scores up into an NPS summary. */
export function npsScore(scores: number[]): NpsSummary {
  const total = scores.length
  if (total === 0) return { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 }

  let promoters = 0
  let passives = 0
  let detractors = 0
  for (const s of scores) {
    const bucket = npsBucket(s)
    if (bucket === 'promoter') promoters++
    else if (bucket === 'passive') passives++
    else detractors++
  }

  const score = Math.round(((promoters - detractors) / total) * 100)
  return { score, promoters, passives, detractors, total }
}

/** True if a value is an integer NPS score in range 0–10. */
export function isValidNpsScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10
}

/* ------------------------------------------------------------------ *
 * IDIC "Customize" — tailor what we show based on what we learned
 *
 * Closes the loop: the primary need captured in "Identify" drives a
 * personalised product recommendation. Each need maps to an ordered list of
 * product categories (most to least relevant). The ranking helper is generic
 * over any product carrying a `cat`, so it stays decoupled from the catalog.
 * ------------------------------------------------------------------ */

/**
 * Pareto (80/20) concentration: what share of total value the top `fraction`
 * of customers accounts for. Returns a 0–1 ratio (0 when there's no value).
 * Used in the admin CRM overview to justify focusing on the top tiers.
 */
export function paretoShare(values: number[], fraction = 0.2): number {
  const total = values.reduce((sum, v) => sum + v, 0)
  if (total <= 0) return 0
  const sorted = [...values].sort((a, b) => b - a)
  const topCount = Math.max(1, Math.ceil(sorted.length * fraction))
  const topSum = sorted.slice(0, topCount).reduce((sum, v) => sum + v, 0)
  return topSum / total
}

/** Ordered category priorities per need. Category ids match lib/catalog.ts. */
export const NEED_CATEGORY_PRIORITY: Record<CustomerNeed, string[]> = {
  EVERYDAY: ['powerbanks', 'chargers', 'accessories'],
  BACKUP: ['stations', 'powerbanks', 'chargers'],
  OFFGRID: ['stations', 'powerbanks', 'accessories'],
  BUSINESS: ['stations', 'chargers', 'powerbanks'],
}

/** A one-line, need-specific pitch for the Hub recommendation card. */
export const NEED_PITCH: Record<CustomerNeed, string> = {
  EVERYDAY: 'Pocket-friendly power to keep your phone going all day.',
  BACKUP: 'Ride out the next outage without missing a beat.',
  OFFGRID: 'Dependable power for wherever the grid does not reach.',
  BUSINESS: 'Keep your shop, stall or work site running.',
}

/**
 * Rank products for a customer's need: items in a higher-priority category
 * come first (preserving the catalog's own order within a category), and
 * anything outside the need's categories is dropped. With no need, order is
 * left unchanged. Generic over any product exposing a `cat` string.
 */
export function recommendProductsForNeed<T extends { cat: string }>(
  products: T[],
  need: CustomerNeed | null | undefined,
  limit = 3
): T[] {
  if (!need) return products.slice(0, limit)
  const priority = NEED_CATEGORY_PRIORITY[need]
  const ranked = products
    .map((p, i) => ({ p, i, rank: priority.indexOf(p.cat) }))
    .filter((x) => x.rank !== -1)
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.i - b.i))
    .map((x) => x.p)
  return ranked.slice(0, limit)
}
