import { prisma } from '@/lib/prisma'
import { CATALOG, type ShopProduct } from '@/lib/catalog'

/**
 * The presentation catalog (images, specs, marketing copy) lives in code; live
 * price + stock come from the database Product table, joined by product name.
 * This is what makes admin Inventory edits show up on the public storefront.
 *
 * If the DB is unavailable, we fall back to the static catalog so the shop still
 * renders (price from code, treated as in stock).
 */
export async function getShopProducts(): Promise<ShopProduct[]> {
  let byName = new Map<string, { price: number; stock: number }>()
  try {
    const rows = await prisma.product.findMany({ select: { name: true, price: true, stock: true } })
    byName = new Map(rows.map((r) => [r.name, { price: r.price, stock: r.stock }]))
  } catch {
    // DB down — degrade gracefully to the static catalog.
  }

  return CATALOG.map((c) => {
    const db = byName.get(c.name)
    if (!db) return { ...c, stock: null, inStock: true }
    return { ...c, price: db.price, stock: db.stock, inStock: db.stock > 0 }
  })
}

export async function getShopProduct(id: string): Promise<ShopProduct | undefined> {
  const all = await getShopProducts()
  return all.find((p) => p.id === id)
}
