/**
 * Delivery rate table — the single source of truth for both the checkout
 * total (client display + server-side charge) and the public rate sheet at
 * /legal/delivery. Kingston and St. Andrew are always priced identically.
 */

export type DeliveryMethod = 'standard' | 'express' | 'pickup'

const KINGSTON_ZONE = new Set(['Kingston', 'St. Andrew'])

export interface PickupLocation {
  name: string
  address: string
}

export const PICKUP_LOCATIONS: PickupLocation[] = [
  { name: 'Webster Memorial United Church', address: '53 Halfway Tree Road' },
  { name: 'Summit, New Kingston', address: '16 Chelsea Avenue' },
]

/** J$ delivery fee for a method + parish. Pickup is always free. */
export function deliveryFee(method: DeliveryMethod, parish: string): number {
  if (method === 'pickup') return 0
  if (KINGSTON_ZONE.has(parish)) return method === 'standard' ? 800 : 1500
  if (parish === 'St. Catherine') return method === 'standard' ? 1500 : 2500
  // Every other parish ships islandwide via Knutsford Express.
  return method === 'standard' ? 700 : 1400
}

/** Which courier actually fulfils a method + parish combination. */
export function deliveryCourier(method: DeliveryMethod, parish: string): string {
  if (method === 'pickup') return 'Pickup'
  if (KINGSTON_ZONE.has(parish) || parish === 'St. Catherine') return 'Kingston Energies courier'
  return 'Knutsford Express'
}

/** Estimated timeframe shown next to the method in checkout. */
export function deliveryTimeframe(method: DeliveryMethod, parish: string): string {
  if (method === 'pickup') return 'Ready today'
  const viaKnutsford = !KINGSTON_ZONE.has(parish) && parish !== 'St. Catherine'
  if (method === 'express') return viaKnutsford ? 'Next-day priority via Knutsford' : 'Next day'
  return viaKnutsford ? '1–2 days via Knutsford' : '1–3 days'
}

/** Order-record line item label for the delivery charge (shown on invoices/admin/tracking). */
export function deliveryLineLabel(method: DeliveryMethod, parish: string): string {
  const courier = deliveryCourier(method, parish)
  const tier = method === 'express' ? 'Express' : 'Standard'
  return `Delivery: ${tier} (${courier}, ${parish})`
}
