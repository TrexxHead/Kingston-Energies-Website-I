/**
 * Delivery rate table — the single source of truth for both the checkout
 * total (client display + server-side charge) and the public rate sheet at
 * /legal/delivery. Kingston and St. Andrew are always priced identically.
 */

export type DeliveryMethod = 'standard' | 'express' | 'pickup'

// The parish list offered at checkout and wherever a delivery address is
// edited afterward — keep both in sync with this one list.
export const PARISHES = ['Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon', 'Manchester', 'St. James']

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

export interface ParsedShippingAddress {
  pickup: boolean
  pickupLocationIndex: number | null
  street: string
  parish: string
}

/**
 * Reverses the shippingAddress string an order was stored with — either
 * "Pickup: <location name>, <address>" or "<street>, <parish>" — back into
 * editable fields. Best-effort: a pickup address is matched against the
 * current PICKUP_LOCATIONS list by name; if it no longer matches (a pickup
 * location was renamed/removed since the order was placed), pickupLocationIndex
 * comes back null rather than a wrong guess.
 */
export function parseShippingAddress(shippingAddress: string | null | undefined): ParsedShippingAddress {
  const raw = (shippingAddress ?? '').trim()
  if (raw.startsWith('Pickup:')) {
    const rest = raw.slice('Pickup:'.length).trim()
    const idx = PICKUP_LOCATIONS.findIndex((loc) => rest.startsWith(loc.name))
    return { pickup: true, pickupLocationIndex: idx >= 0 ? idx : null, street: '', parish: '' }
  }
  const parts = raw.split(',').map((p) => p.trim())
  const parish = parts.length > 1 ? parts[parts.length - 1] : ''
  const street = parts.length > 1 ? parts.slice(0, -1).join(', ') : raw
  return { pickup: false, pickupLocationIndex: null, street, parish }
}

/**
 * Infers which delivery method an already-placed order used, from its
 * recorded line items (a "Delivery: Standard/Express (…)" manual line) and
 * its shippingAddress. Falls back to 'standard' when neither signal is
 * conclusive — a real address with no delivery line at all is unusual (fee
 * is always > 0 for a real delivery) but shouldn't leave the edit form with
 * no method selected.
 */
export function guessDeliveryMethod(items: { name: string }[], shippingAddress: string | null | undefined): DeliveryMethod {
  if ((shippingAddress ?? '').trim().startsWith('Pickup:')) return 'pickup'
  if (items.some((i) => i.name.startsWith('Delivery: Express'))) return 'express'
  return 'standard'
}
