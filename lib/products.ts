import { prisma } from '@/lib/prisma'
import { CATALOG, type ShopProduct, type SpecItem, type Category } from '@/lib/catalog'

// The DB fields we overlay onto the presentation catalog.
interface DbProduct {
  id: string
  catalogId: string | null
  name: string
  price: number
  salePrice: number | null
  stock: number
  archived: boolean
  category: string | null
  spec: string | null
  badge: string | null
  description: string | null
  shortDescription: string | null
  brand: string | null
  weight: string | null
  dimensions: string | null
  warranty: string | null
  images: string[]
  features: string[]
  tags: string[]
  specs: unknown
}

const CAT_MAP: Record<string, Category> = {
  POWERBANKS: 'powerbanks',
  CHARGERS: 'chargers',
  STATIONS: 'stations',
  ACCESSORIES: 'accessories',
  COMPONENTS: 'components',
}

function toSpecItems(v: unknown): SpecItem[] | undefined {
  if (!Array.isArray(v)) return undefined
  const items = v
    .filter((x): x is { label?: unknown; value?: unknown } => typeof x === 'object' && x !== null)
    .map((x) => ({ label: String(x.label ?? ''), value: String(x.value ?? '') }))
    .filter((x) => x.label || x.value)
  return items.length ? items : undefined
}

/** A stable id for a DB-only product that isn't in the static catalog. */
function dbId(name: string): string {
  return 'db-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Trimmed + lowercased so a stray space or case difference between the
// catalog entry and the admin-entered product name doesn't silently break
// the join between them (price, images, description, … all depend on it).
// Only used as a fallback for rows that haven't been linked by catalogId yet
// (see scripts/backfillCatalogIds.ts) — once linked, renaming a product can
// no longer affect the join at all.
export function normName(s: string): string {
  return s.trim().toLowerCase()
}

/** The stable catalog/shop id for a product — prefer its real catalogId link, fall back to matching its current name. */
export function productIdForName(name: string, catalogId?: string | null): string {
  if (catalogId) return catalogId
  return CATALOG.find((c) => normName(c.name) === normName(name))?.id ?? dbId(name)
}

/** Apply admin CMS overrides on top of a base catalog entry (or a bare one). */
function overlay(base: ShopProduct, db: DbProduct): ShopProduct {
  const onSale = db.salePrice != null && db.salePrice > 0
  const effectivePrice = onSale ? (db.salePrice as number) : db.price
  const gallery = db.images.length ? db.images : base.gallery
  const specs = toSpecItems(db.specs)
  return {
    ...base,
    name: db.name,
    price: effectivePrice,
    listPrice: onSale ? db.price : undefined,
    stock: db.stock,
    inStock: db.stock > 0,
    image: db.images[0] ?? base.image,
    gallery,
    spec: db.spec ?? base.spec,
    badge: db.badge ?? base.badge,
    warranty: db.warranty ?? base.warranty,
    features: db.features.length ? db.features : base.features,
    cat: db.category ? CAT_MAP[db.category] ?? base.cat : base.cat,
    shortDescription: db.shortDescription ?? undefined,
    longDescription: db.description ?? undefined,
    brand: db.brand ?? undefined,
    weight: db.weight ?? undefined,
    dimensions: db.dimensions ?? undefined,
    tags: db.tags.length ? db.tags : undefined,
    specs,
  }
}

/**
 * The presentation catalog (images, specs, marketing copy) lives in code, but
 * any field an admin fills in via Inventory (name, price, sale price, images,
 * descriptions, specs, warranty, …) is overlaid from the database Product
 * table. Joined primarily by Product.catalogId — a stable link set once (see
 * scripts/backfillCatalogIds.ts) — so renaming a product in admin can never
 * break the link and fork it into a duplicate listing the way matching by
 * name alone used to. Rows not yet linked (catalogId still null) fall back to
 * matching by their current name. Products that exist only in the database
 * (added from the admin CMS, no catalog entry) are surfaced too. If the DB is
 * unavailable we degrade to the static catalog so the shop still renders.
 */
export async function getShopProducts(): Promise<ShopProduct[]> {
  let rows: DbProduct[] = []
  try {
    rows = (await prisma.product.findMany({
      select: {
        id: true, catalogId: true, name: true, price: true, salePrice: true, stock: true, archived: true, category: true,
        spec: true, badge: true, description: true, shortDescription: true, brand: true,
        weight: true, dimensions: true, warranty: true, images: true, features: true, tags: true, specs: true,
      },
    })) as DbProduct[]
  } catch {
    // DB down — degrade gracefully to the static catalog.
    return CATALOG.map((c) => ({ ...c, stock: null, inStock: true }))
  }

  const byCatalogId = new Map(rows.filter((r) => r.catalogId).map((r) => [r.catalogId as string, r]))
  const byName = new Map(rows.map((r) => [normName(r.name), r]))
  const usedIds = new Set<string>()

  // Average rating + count per product (keyed by catalog id).
  const ratings = new Map<string, { rating: number; reviewCount: number }>()
  try {
    const grouped = await prisma.review.groupBy({
      by: ['productId'],
      _avg: { rating: true },
      _count: { _all: true },
    })
    for (const g of grouped) {
      if (g._avg.rating != null) ratings.set(g.productId, { rating: g._avg.rating, reviewCount: g._count._all })
    }
  } catch {
    // ratings are non-essential — skip on error
  }
  const withRating = (p: ShopProduct): ShopProduct => {
    const r = ratings.get(p.id)
    return r ? { ...p, rating: Math.round(r.rating * 10) / 10, reviewCount: r.reviewCount } : p
  }

  const fromCatalog: ShopProduct[] = CATALOG.map((c) => {
    const db = byCatalogId.get(c.id) ?? byName.get(normName(c.name))
    const base: ShopProduct = { ...c, stock: null, inStock: true }
    if (!db) return withRating(base)
    usedIds.add(db.id)
    return withRating(overlay(base, db))
  })

  // DB-only products (created in the CMS, no catalog entry) — show unless archived.
  const fromDb: ShopProduct[] = rows
    .filter((r) => !usedIds.has(r.id) && !r.archived)
    .map((r) => {
      const base: ShopProduct = {
        id: dbId(r.name),
        cat: r.category ? CAT_MAP[r.category] ?? 'accessories' : 'accessories',
        name: r.name,
        spec: r.spec ?? '',
        price: r.price,
        image: null,
        stock: r.stock,
        inStock: r.stock > 0,
      }
      return overlay(base, r)
    })

  return [...fromCatalog, ...fromDb]
}

const PRODUCT_SELECT = {
  id: true, catalogId: true, name: true, price: true, salePrice: true, stock: true, archived: true, category: true,
  spec: true, badge: true, description: true, shortDescription: true, brand: true,
  weight: true, dimensions: true, warranty: true, images: true, features: true, tags: true, specs: true,
} as const

/**
 * A single product page's data, without paying for the full-catalog fetch +
 * full-reviews aggregate that getShopProducts() does for the /shop listing.
 * Catalog-defined products (the vast majority, and the ones any ad campaign
 * or share link would point at) get a scoped DB lookup. DB-only products
 * (added purely via the admin CMS, no catalog entry) have no cheap way to
 * reverse their generated id back to a name, so those fall back to the full
 * listing — a small, rare set, not the hot path this optimizes for.
 */
export async function getShopProduct(id: string): Promise<ShopProduct | undefined> {
  const catalogEntry = CATALOG.find((c) => c.id === id)
  if (!catalogEntry) {
    const all = await getShopProducts()
    return all.find((p) => p.id === id)
  }

  let product: ShopProduct = { ...catalogEntry, stock: null, inStock: true }
  try {
    const rows = (await prisma.product.findMany({
      where: { OR: [{ catalogId: catalogEntry.id }, { name: { equals: catalogEntry.name, mode: 'insensitive' } }] },
      select: PRODUCT_SELECT,
    })) as DbProduct[]
    const db = rows.find((r) => r.catalogId === catalogEntry.id) ?? rows.find((r) => normName(r.name) === normName(catalogEntry.name))
    if (db) product = overlay(product, db)
  } catch {
    // DB down — degrade to the static catalog entry, same as getShopProducts().
  }

  try {
    const agg = await prisma.review.groupBy({
      by: ['productId'],
      where: { productId: id },
      _avg: { rating: true },
      _count: { _all: true },
    })
    if (agg[0]?._avg.rating != null) {
      product = { ...product, rating: Math.round(agg[0]._avg.rating * 10) / 10, reviewCount: agg[0]._count._all }
    }
  } catch {
    // ratings are non-essential — skip on error
  }

  return product
}
