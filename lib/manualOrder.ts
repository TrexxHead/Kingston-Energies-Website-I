import { prisma } from '@/lib/prisma'
import { sendNewOrderAlert } from '@/lib/email'
import { postOrderCogs, postOrderPayment, postOrderRevenue } from '@/lib/ledger/post'
import { fulfillOrderItems } from '@/lib/orderFulfillment'
import { withOrderNoRetry } from '@/lib/orderNo'

export interface ManualOrderInput {
  customerName: string
  contact?: string | null
  email?: string | null
  phone?: string | null
  source: 'WEBSITE' | 'WHATSAPP' | 'INSTAGRAM' | 'FACE_TO_FACE' | 'PHONE' | 'OTHER'
  paymentMethod?: string | null
  paid?: boolean
  shippingAddress?: string | null
  // The date this order is pinned to on the Finance → Calendar view — set
  // when an order is created directly from a calendar day (or a staff
  // member wants to flag when it needs to go out). Independent of the
  // ledger date; purely a scheduling/visibility field.
  estimatedDelivery?: Date | null
  items: { name: string; price: number; qty: number }[]
}

/**
 * Records a sale the admin is entering by hand rather than one that came
 * through checkout — a manual order (Instagram DM, phone call, face to
 * face) or a converted quote. Always guest-style (no userId): the
 * "customer" here didn't go through the site, so this never creates an
 * account or accrues loyalty points. Lands in the exact same Order table as
 * website orders, so it flows through the normal pipeline — status changes,
 * invoicing, delivery tracking, ledger postings all work identically.
 *
 * Extracted from app/api/admin/orders/route.ts's POST handler so the quote
 * → order conversion flow (app/api/admin/leads/[id]/convert) reuses this
 * exact path instead of a second, drifting copy of the same logic.
 */
export async function createManualOrder(input: ManualOrderInput) {
  const { customerName, contact, email, phone, source, paymentMethod, paid, shippingAddress, estimatedDelivery, items } = input
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  const order = await withOrderNoRetry((orderNo) =>
    prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo,
          customerName,
          status: 'PENDING',
          source,
          contact: contact ?? null,
          email: email ?? null,
          phone: phone ?? null,
          shippingAddress: shippingAddress ?? null,
          paymentMethod: paymentMethod ?? null,
          paid: paid ?? false,
          estimatedDelivery: estimatedDelivery ?? null,
          total,
          items: { create: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) },
        },
        include: { items: true },
      })
      // Staff are trusted to record a sale deliberately even if stock is off (e.g. a backorder) — never block it.
      await fulfillOrderItems(tx, created.items.map((oi) => ({ orderItemId: oi.id, name: oi.name, qty: oi.qty })), { mode: 'allow' })
      return created
    })
  )

  // A manual order is a real sale — it hits the ledger exactly like a website
  // order, which is what keeps off-site revenue inside the financial statements.
  void postOrderRevenue({ ...order, items }).catch((err) => console.error('[ledger] manual order revenue posting failed:', err))
  void postOrderCogs({ ...order, items }).catch((err) => console.error('[ledger] manual order COGS posting failed:', err))
  if (order.paid) {
    void postOrderPayment(order, order.createdAt).catch((err) => console.error('[ledger] manual order payment posting failed:', err))
  }

  void sendNewOrderAlert({ orderNo: order.orderNo, customerName, total, paymentMethod: paymentMethod ?? null, items })

  return order
}
