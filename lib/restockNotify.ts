import { prisma } from '@/lib/prisma'
import { sendBulkEmail, wrapEmailHtml } from '@/lib/email'
import { productIdForName } from '@/lib/products'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

/**
 * Email everyone waiting on a now-restocked product, then clear their
 * requests. Call this from every code path that can move a product's stock
 * from 0 to positive — both the product-edit form and manual stock
 * adjustments (receiving inventory), which used to only notify from the
 * former, silently missing the more common of the two in practice.
 */
export async function notifyRestockWaitlist(productName: string, stock: number, catalogIdLink: string | null): Promise<void> {
  const catalogId = productIdForName(productName, catalogIdLink)
  const waiters = await prisma.restockRequest.findMany({ where: { productId: catalogId }, select: { email: true } })
  if (waiters.length === 0) return

  await sendBulkEmail(
    waiters.map((w) => w.email),
    `${productName} is back in stock`,
    wrapEmailHtml(
      'Back in stock',
      `<p><strong>${escapeHtml(productName)}</strong> is back in stock${stock <= 5 ? `, only ${stock} left` : ''}. Grab yours before it sells out again.</p>
       <p><a href="${siteUrl}/product/${catalogId}" style="color:#4a7c2c;font-weight:600;">Shop ${escapeHtml(productName)} &rarr;</a></p>`,
    ),
  ).catch(() => {})

  await prisma.restockRequest.deleteMany({ where: { productId: catalogId } }).catch(() => {})
}
