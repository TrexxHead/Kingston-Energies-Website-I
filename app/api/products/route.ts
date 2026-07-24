import { NextResponse } from 'next/server'
import { getShopProducts } from '@/lib/products'

/**
 * Public, lightweight live price/stock map keyed by catalog id, so client
 * components (e.g. the compare modal) can show the same up-to-date figures as
 * the shop instead of the static catalog fallback.
 */
export async function GET() {
  const products = await getShopProducts()
  const prices = Object.fromEntries(products.map((p) => [p.id, { price: p.price, inStock: p.inStock, stock: p.stock }]))
  return NextResponse.json({ prices })
}
