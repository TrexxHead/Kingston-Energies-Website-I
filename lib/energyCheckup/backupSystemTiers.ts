import { getProduct, type Product } from '@/lib/catalog'

/**
 * "Build My Backup System" tiers — Kingston Energies' own products only,
 * bundled by what they actually cover, cost-tier ordered cheapest first.
 * Prices are never hardcoded here; every tier resolves its live total from
 * `lib/catalog.ts` at read time, so a price change in the catalog is
 * reflected automatically rather than silently going stale.
 */

export type TierId = 'essential' | 'balanced' | 'resilient'

export interface BackupTierDef {
  id: TierId
  label: string
  tagline: string
  covers: string
  productIds: string[]
}

export const TIER_DEFS: BackupTierDef[] = [
  {
    id: 'essential',
    label: 'Essential',
    tagline: 'Keep phones and small devices alive',
    covers: 'Phones, small electronics, comms during a short outage.',
    productIds: ['pb10'],
  },
  {
    id: 'balanced',
    label: 'Balanced',
    tagline: 'Run critical small appliances for hours',
    covers: 'Router/modem, fans, lights, phone charging, and short fridge runs.',
    productIds: ['st300'],
  },
  {
    id: 'resilient',
    label: 'Resilient',
    tagline: 'Recharge as you go through a multi-day outage',
    covers: 'Everything Balanced covers, plus daytime solar recharge so you\'re not just running down one battery.',
    productIds: ['st300', 'solar'],
  },
]

export interface BackupTier extends BackupTierDef {
  products: Product[]
  totalPrice: number
}

/** Resolves each tier's product IDs against the live catalog and sums their price. */
export function resolveTiers(): BackupTier[] {
  return TIER_DEFS.map((def) => {
    const products = def.productIds.map((id) => getProduct(id)).filter((p): p is Product => Boolean(p))
    return {
      ...def,
      products,
      totalPrice: products.reduce((sum, p) => sum + p.price, 0),
    }
  })
}
