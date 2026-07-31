import { prisma } from '@/lib/prisma'
import { CATALOG } from '@/lib/catalog'

export interface CartItemInput {
  name: string
  price: number
  qty: number
}

/**
 * Confirms every line in a customer-submitted cart is a real product at its
 * real current price, before that cart becomes an order — and for the WiPay
 * path, before it becomes an amount charged to a card.
 *
 * The public checkout endpoints (/api/orders, /api/payments/wipay/create)
 * take `items[].price` straight from the request body so the order can be
 * created without a second live lookup per item on every submit. Nothing
 * upstream of this point re-derives that price from the catalog, which means
 * a client that edits the request — trivial with devtools or curl — could
 * check out at any price it likes. This closes that: matched by name against
 * the live Product table (current DB prices, including sales) merged with
 * the static CATALOG (for anything not yet in the DB), any item whose name
 * isn't recognised or whose price doesn't match exactly fails validation.
 *
 * Intentionally NOT applied to /api/admin/orders — staff creating a phone or
 * in-person order are trusted to enter the right figure themselves, same as
 * every other manual-entry field on that form.
 */
export async function validateCartPrices(items: CartItemInput[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const dbProducts = await prisma.product.findMany({ select: { name: true, price: true, salePrice: true } })

  const priceByName = new Map<string, number>()
  // Static catalog first, DB second — DB (with any admin-set sale price) wins on a name collision.
  for (const p of CATALOG) priceByName.set(p.name.trim().toLowerCase(), p.price)
  for (const p of dbProducts) priceByName.set(p.name.trim().toLowerCase(), p.salePrice ?? p.price)

  for (const item of items) {
    const real = priceByName.get(item.name.trim().toLowerCase())
    if (real === undefined) {
      return { ok: false, error: `"${item.name}" isn't a product we recognise — please refresh your cart and try again.` }
    }
    // Prices here are whole Jamaican dollars; a fraction of a cent of float
    // drift is not a manipulation attempt.
    if (Math.abs(real - item.price) > 0.01) {
      return { ok: false, error: 'One or more prices in your cart have changed. Please refresh and try again.' }
    }
  }

  return { ok: true }
}
