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
