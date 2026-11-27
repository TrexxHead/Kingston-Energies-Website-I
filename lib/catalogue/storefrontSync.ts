import { CATALOG, type Product } from '@/lib/catalog'
import type { ProductKind } from './evidence'

/**
 * Seeds CatalogueSku stubs from the storefront catalogue. Existing storefront
 * values are recorded ONLY as unverified listing claims — they were never
 * checked against manufacturer documentation, and several listings don't
 * name an exact manufacturer model at all. Verification happens in admin.
 */

export function kindForCatalogItem(p: Pick<Product, 'id' | 'cat'>): ProductKind {
  if (p.id === 'solar') return 'solar_panel'
  if (p.id.startsWith('cmp-adpt') || p.cat === 'chargers') return 'charger'
  if (p.cat === 'components') return 'cable'
  if (p.cat === 'powerbanks') return 'power_bank'
  if (p.cat === 'stations') return 'power_station'
  return 'accessory'
}

export interface ListingClaim {
  field: string
  valueNum?: number
  valueText?: string
  unit?: string
}

export const LISTING_NOTE = 'Storefront listing (lib/catalog.ts). Not verified against manufacturer documentation.'

export function listingClaims(p: Product, kind: ProductKind): ListingClaim[] {
  const claims: ListingClaim[] = []
  const mah = p.cap && /mAh/i.test(p.cap) ? Number(p.cap.replace(/[^\d.]/g, '')) : null
  if (kind === 'power_bank' && mah) claims.push({ field: 'capacity_mah', valueNum: mah, unit: 'mAh' })
  if (kind === 'power_bank' && p.ports) claims.push({ field: 'ports', valueText: p.ports })
  if (kind === 'power_station' && p.outputWatts) claims.push({ field: 'ac_continuous_w', valueNum: p.outputWatts, unit: 'W' })
  if (kind === 'solar_panel' && p.cap && /W$/i.test(p.cap)) claims.push({ field: 'rated_power_w', valueNum: Number(p.cap.replace(/[^\d.]/g, '')), unit: 'W' })
  if (p.warranty) claims.push({ field: 'local_warranty', valueText: p.warranty })
  return claims
}

export function storefrontItems() {
  return CATALOG.map((p) => ({ product: p, kind: kindForCatalogItem(p), claims: listingClaims(p, kindForCatalogItem(p)) }))
}
