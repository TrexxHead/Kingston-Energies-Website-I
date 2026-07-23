import { NextResponse } from 'next/server'
import { guardIntegration } from '@/lib/integrationAuth'
import { getShopProducts } from '@/lib/products'
import { fmt } from '@/lib/catalog'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * Live catalog for the WhatsApp / Instagram bots — id, name, category, current
 * price and stock, plus a ready-to-send one-line blurb and a product link. n8n
 * can hand the `summary` straight to Jordyn or format `products` into a menu.
 */
export async function GET(request: Request) {
  const denied = guardIntegration(request)
  if (denied) return denied

  const all = await getShopProducts()
  const products = all.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.cat,
    price: p.price,
    priceFormatted: fmt(p.price),
    inStock: p.inStock,
    stock: p.stock,
    capacity: p.cap ?? null,
    blurb: p.best ?? p.spec ?? null,
    url: `${siteUrl}/product/${p.id}`,
  }))

  // A compact text block the bot can quote directly.
  const summary = products
    .map((p) => `• ${p.name} — ${p.priceFormatted}${p.inStock ? '' : ' (out of stock)'} — ${p.url}`)
    .join('\n')

  return NextResponse.json({ products, summary, shopUrl: `${siteUrl}/shop` })
}
