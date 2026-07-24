import { prisma } from '@/lib/prisma'
import { CATALOG, type ShopProduct, type SpecItem, type Category } from '@/lib/catalog'

// The DB fields we overlay onto the presentation catalog.
interface DbProduct {
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

/** Apply admin CMS overrides on top of a base catalog entry (or a bare one). */
function overlay(base: ShopProduct, db: DbProduct): ShopProduct {
  const onSale = db.salePrice != null && db.salePrice > 0
  const effectivePrice = onSale ? (db.salePrice as number) : db.price
  const gallery = db.images.length ? db.images : base.gallery
  const specs = toSpecItems(db.specs)
  return {
    ...base,
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
 * any field an admin fills in via Inventory (price, sale price, images,
 * descriptions, specs, warranty, …) is overlaid from the database Product table,
 * joined by product name. Products that exist only in the database (added from
 * the admin CMS) are surfaced too. If the DB is unavailable we degrade to the
 * static catalog so the shop still renders.
 */
export async function getShopProducts(): Promise<ShopProduct[]> {
  let rows: DbProduct[] = []
  try {
    rows = (await prisma.product.findMany({
      select: {
        name: true, price: true, salePrice: true, stock: true, archived: true, category: true,
        spec: true, badge: true, description: true, shortDescription: true, brand: true,
        weight: true, dimensions: true, warranty: true, images: true, features: true, tags: true, specs: true,
      },
    })) as DbProduct[]
  } catch {
    // DB down — degrade gracefully to the static catalog.
    return CATALOG.map((c) => ({ ...c, stock: null, inStock: true }))
  }

  const byName = new Map(rows.map((r) => [r.name, r]))
  const usedNames = new Set<string>()

  const fromCatalog: ShopProduct[] = CATALOG.map((c) => {
    const db = byName.get(c.name)
    const base: ShopProduct = { ...c, stock: null, inStock: true }
    if (!db) return base
    usedNames.add(c.name)
    return overlay(base, db)
  })

  // DB-only products (created in the CMS, no catalog entry) — show unless archived.
  const fromDb: ShopProduct[] = rows
    .filter((r) => !usedNames.has(r.name) && !r.archived)
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

export async function getShopProduct(id: string): Promise<ShopProduct | undefined> {
  const all = await getShopProducts()
  return all.find((p) => p.id === id)
}
