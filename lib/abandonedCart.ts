import { prisma } from '@/lib/prisma'
import { sendBulkEmail, wrapEmailHtml } from '@/lib/email'
import { filterSuppressed } from '@/lib/suppression'
import { fmt } from '@/lib/catalog'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kingstonenergies.com'

// Long enough that "still browsing" doesn't look abandoned; short enough the
// reminder still lands while the cart's on the customer's mind.
const ABANDON_AFTER_MS = 3 * 60 * 60 * 1000
// Beyond this, prices/stock have likely moved on and a reminder reads as stale
// spam rather than a nudge — better to just stop.
const STOP_AFTER_MS = 14 * 24 * 60 * 60 * 1000

interface CartItem {
  name: string
  price: number
  qty: number
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function recoveryHtml(items: CartItem[], total: number): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#1c2a25">${escapeHtml(i.name)} × ${i.qty}</td><td style="padding:6px 0;text-align:right;color:#1c2a25">${fmt(i.price * i.qty)}</td></tr>`,
    )
    .join('')
  return wrapEmailHtml(
    'Still thinking it over?',
    `<p style="margin:0 0 14px;color:#1c2a25;line-height:1.6">You left a few things in your cart — still there, waiting for you.</p>
     <table style="width:100%;border-collapse:collapse;margin-bottom:6px">${rows}</table>
     <div style="font-weight:700;text-align:right;margin-bottom:18px;color:#1c2a25;border-top:1px solid #e2e8e4;padding-top:10px">Total: ${fmt(total)}</div>
     <a href="${siteUrl}/cart" style="display:inline-block;background:#1f6b45;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600">Complete your order</a>`,
  )
}

/**
 * Finds carts abandoned within the recovery window (not sent one yet, not so
 * old it'd feel stale) and emails a reminder — one per abandonment, since
 * lib/prisma's cart-sync route clears recoveryEmailSentAt on every real sync,
 * so a customer who comes back and re-abandons is eligible again.
 */
export async function runAbandonedCartRecovery(): Promise<{ sent: number }> {
  const now = Date.now()
  const olderThan = new Date(now - ABANDON_AFTER_MS)
  const notTooStale = new Date(now - STOP_AFTER_MS)

  const carts = await prisma.cart.findMany({
    where: {
      status: 'ACTIVE',
      itemCount: { gt: 0 },
      recoveryEmailSentAt: null,
      updatedAt: { lte: olderThan, gte: notTooStale },
      email: { not: null },
    },
    select: { id: true, email: true, items: true, total: true },
  })
  if (carts.length === 0) return { sent: 0 }

  const eligible = new Set((await filterSuppressed(carts.map((c) => c.email as string))).map((e) => e.toLowerCase()))

  let sent = 0
  for (const cart of carts) {
    if (!cart.email || !eligible.has(cart.email.toLowerCase())) continue
    const items = Array.isArray(cart.items) ? (cart.items as unknown as CartItem[]) : []
    if (items.length === 0) continue

    const delivered = await sendBulkEmail([cart.email], 'You left something in your cart', recoveryHtml(items, cart.total))
    if (delivered > 0) {
      await prisma.cart.update({ where: { id: cart.id }, data: { recoveryEmailSentAt: new Date() } }).catch(() => {})
      sent++
    }
  }
  return { sent }
}
