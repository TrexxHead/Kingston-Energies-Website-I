import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { sendBulkEmail } from '@/lib/email'
import { notifyUser } from '@/lib/notify'

const schema = z.object({ reason: z.string().max(300).optional() })

// Stages past which an order can no longer be cancelled, with a clear reason.
const BLOCKED: Record<string, string> = {
  OUT: 'This order is already out for delivery and can no longer be cancelled.',
  DONE: 'This order has already been delivered and can no longer be cancelled.',
  CANCELLED: 'This order has already been cancelled.',
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  const reason = parsed.success ? parsed.data.reason?.trim() : undefined

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, user: { select: { email: true } } } })
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  // Validate eligibility.
  const blockedMsg = BLOCKED[order.status]
  if (blockedMsg) return NextResponse.json({ error: blockedMsg }, { status: 409 })

  // Restock each item (match the storefront/DB product by name).
  await Promise.all(
    order.items.map((it) =>
      prisma.product.updateMany({ where: { name: it.name }, data: { stock: { increment: it.qty } } }).catch(() => {}),
    ),
  )

  const now = new Date()
  await prisma.order.update({
    where: { id },
    data: { status: 'CANCELLED', cancelReason: reason ?? 'Cancelled by customer', cancelledAt: now },
  })

  // Log the event (timeline).
  await prisma.orderEvent.create({
    data: { orderId: id, type: 'CANCELLED', label: 'Cancelled by customer', note: reason ?? null },
  }).catch(() => {})

  // In-app notification for the customer.
  void notifyUser(session.user.id, 'ORDER', `Order ${order.orderNo} cancelled`, {
    body: `Your order was cancelled${reason ? ` (${reason})` : ''}. Any payment made will be refunded.`,
    href: '/hub/orders',
  })

  // Notify the customer + admin (best-effort email).
  const customerEmail = order.user?.email ?? order.email
  if (customerEmail) {
    void sendBulkEmail(
      [customerEmail],
      `Order ${order.orderNo} cancelled`,
      `<p>Your order <strong>${order.orderNo}</strong> has been cancelled${reason ? ` (${escapeHtml(reason)})` : ''}. Any payment made will be refunded. — Kingston Energies</p>`,
    )
  }
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    void sendBulkEmail([adminEmail], `Order ${order.orderNo} cancelled by customer`, `<p>${escapeHtml(order.customerName)} cancelled ${order.orderNo}${reason ? `: ${escapeHtml(reason)}` : ''}. Stock has been restored.</p>`)
  }

  return NextResponse.json({ ok: true, message: `Order ${order.orderNo} cancelled. Stock restored and a confirmation emailed.` })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
