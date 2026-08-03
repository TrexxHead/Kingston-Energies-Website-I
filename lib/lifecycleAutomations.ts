import { prisma } from '@/lib/prisma'
import { sendBulkEmail, wrapEmailHtml } from '@/lib/email'
import { filterSuppressed } from '@/lib/suppression'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kingstonenergies.com'

/**
 * Fixed, code-defined lifecycle automations — not a visual builder, just a
 * couple of well-scoped recipes run from the marketing-automations cron.
 * Each is idempotent via AutomationSend: every trigger instance (a signup, an
 * order) gets exactly one send, tracked by a unique key, so re-running the
 * cron on the same data is always safe.
 */

async function alreadySent(key: string): Promise<boolean> {
  return Boolean(await prisma.automationSend.findUnique({ where: { key }, select: { id: true } }))
}

async function markSent(key: string, email: string): Promise<void> {
  await prisma.automationSend.create({ data: { key, email } }).catch(() => {})
}

// --- Welcome series -------------------------------------------------------

const WELCOME_DELAY_MS = 2 * 24 * 60 * 60 * 1000 // 2 days after signup — enough time to have looked around
const WELCOME_WINDOW_MS = 14 * 24 * 60 * 60 * 1000 // don't backfill old accounts if this automation is added later

function welcomeHtml(name: string | null): string {
  return wrapEmailHtml(
    'Welcome to Kingston Energies',
    `<p style="margin:0 0 14px;color:#1c2a25;line-height:1.6">Hi${name ? ` ${escapeHtml(name)}` : ''}, welcome. We build power banks, chargers and stations for actual Kingston conditions, outages included.</p>
     <p style="margin:0 0 14px;color:#1c2a25;line-height:1.6">A few things worth knowing: delivery is free over J$10,000, every device carries a 14-day replacement guarantee on top of its manufacturer warranty, and your first order gets 10% off automatically at checkout.</p>
     <a href="${siteUrl}/shop" style="display:inline-block;background:#1f6b45;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600">Browse the shop</a>`,
  )
}

/** Emails every verified signup, once, a couple of days after they join. */
export async function runWelcomeSeries(): Promise<{ sent: number }> {
  const before = new Date(Date.now() - WELCOME_DELAY_MS)
  const after = new Date(Date.now() - WELCOME_WINDOW_MS)

  const candidates = await prisma.user.findMany({
    where: { role: 'USER', emailVerified: { not: null }, createdAt: { lte: before, gte: after } },
    select: { id: true, email: true, name: true },
  })
  if (candidates.length === 0) return { sent: 0 }

  const eligible = new Set((await filterSuppressed(candidates.map((c) => c.email))).map((e) => e.toLowerCase()))

  let sent = 0
  for (const c of candidates) {
    const key = `welcome:${c.id}`
    if (!eligible.has(c.email.toLowerCase())) continue
    if (await alreadySent(key)) continue
    const delivered = await sendBulkEmail([c.email], 'Welcome to Kingston Energies', welcomeHtml(c.name))
    if (delivered > 0) {
      await markSent(key, c.email)
      sent++
    }
  }
  return { sent }
}

// --- Review request ---------------------------------------------------------

const REVIEW_REQUEST_DELAY_MS = 5 * 24 * 60 * 60 * 1000 // 5 days after delivery — enough time to actually use it
const REVIEW_REQUEST_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

function reviewRequestHtml(customerName: string, orderNo: string): string {
  return wrapEmailHtml(
    'How is it so far?',
    `<p style="margin:0 0 14px;color:#1c2a25;line-height:1.6">Hi ${escapeHtml(customerName)}, your order ${escapeHtml(orderNo)} should have settled in by now. If you have a minute, a quick review helps other customers a lot, and earns you loyalty points.</p>
     <a href="${siteUrl}/hub/orders" style="display:inline-block;background:#1f6b45;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600">Leave a review</a>`,
  )
}

/**
 * Emails a customer once per delivered order, a few days after delivery,
 * asking for a review. Uses Order.updatedAt as a proxy for "when it was
 * delivered" — there's no dedicated deliveredAt timestamp, and DONE orders
 * are rarely touched again, so this is close enough without adding a join
 * against OrderEvent for the exact stage-change moment.
 */
export async function runReviewRequests(): Promise<{ sent: number }> {
  const before = new Date(Date.now() - REVIEW_REQUEST_DELAY_MS)
  const after = new Date(Date.now() - REVIEW_REQUEST_WINDOW_MS)

  const orders = await prisma.order.findMany({
    where: { status: 'DONE', email: { not: null }, updatedAt: { lte: before, gte: after } },
    select: { id: true, orderNo: true, customerName: true, email: true },
  })
  if (orders.length === 0) return { sent: 0 }

  const eligible = new Set((await filterSuppressed(orders.map((o) => o.email as string))).map((e) => e.toLowerCase()))

  let sent = 0
  for (const o of orders) {
    const key = `review-request:${o.id}`
    if (!o.email || !eligible.has(o.email.toLowerCase())) continue
    if (await alreadySent(key)) continue
    const delivered = await sendBulkEmail([o.email], 'How is it so far?', reviewRequestHtml(o.customerName, o.orderNo))
    if (delivered > 0) {
      await markSent(key, o.email)
      sent++
    }
  }
  return { sent }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
