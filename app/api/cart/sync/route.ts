import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'

const schema = z.object({
  cartId: z.string().min(6).max(60),
  items: z.array(z.object({ name: z.string().max(160), price: z.number(), qty: z.number().int().min(0) })).max(50),
  total: z.number().min(0),
})

/**
 * Persist a snapshot of the browser cart so abandoned carts + conversion rate
 * can be measured. Best-effort: never blocks the shopping flow.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 200 })

  const { cartId, items, total } = parsed.data
  const session = await getServerSession(authOptions)
  const itemCount = items.reduce((n, i) => n + i.qty, 0)

  try {
    if (itemCount === 0) {
      // Emptied cart — drop the snapshot unless it already converted.
      await prisma.cart.deleteMany({ where: { id: cartId, status: 'ACTIVE' } })
      return NextResponse.json({ ok: true })
    }
    await prisma.cart.upsert({
      where: { id: cartId },
      create: {
        id: cartId,
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
        items,
        itemCount,
        total,
        status: 'ACTIVE',
      },
      update: {
        // Don't resurrect a converted cart.
        userId: session?.user?.id ?? undefined,
        email: session?.user?.email ?? undefined,
        items,
        itemCount,
        total,
        // A real edit means they're active again, not abandoned — clear any
        // prior recovery-email flag so a later abandonment gets its own email.
        recoveryEmailSentAt: null,
      },
    })
  } catch {
    // ignore — analytics must never break the cart
  }
  return NextResponse.json({ ok: true })
}
