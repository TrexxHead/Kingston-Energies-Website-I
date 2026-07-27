import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'
import { guardAdmin } from '@/lib/requireAdmin'
import { postStockAdjustment } from '@/lib/ledger/post'

const schema = z.object({
  type: z.enum(['SET', 'ADD', 'SUBTRACT']),
  amount: z.number().int().min(0).max(1_000_000),
  reason: z.string().max(300).optional(),
})

/**
 * The only way stock quantities change outside of a real sale — always with a
 * stated reason, logged to StockAdjustment for an audit trail. This never
 * touches Order/OrderItem, so it can't affect revenue, sales, or profit
 * reporting; it only moves the Product.stock number (and therefore the
 * "inventory value" figure derived from it).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid adjustment' }, { status: 400 })
  const { type, amount, reason } = parsed.data

  const { id } = await params
  const product = await prisma.product.findUnique({ where: { id }, select: { stock: true } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const previousStock = product.stock
  let newStock: number
  if (type === 'SET') newStock = amount
  else if (type === 'ADD') newStock = previousStock + amount
  else newStock = Math.max(0, previousStock - amount)

  const session = await getServerSession(authOptions)

  const [updated, adjustment] = await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { stock: newStock } }),
    prisma.stockAdjustment.create({
      data: {
        productId: id,
        type,
        delta: newStock - previousStock,
        previousStock,
        newStock,
        reason: reason?.trim() || null,
        adminEmail: session?.user?.email ?? null,
      },
    }),
  ])

  // Revalue inventory in the ledger (Inventory ↔ Shrinkage). Never touches a
  // revenue account, so an adjustment can't move sales or profit.
  void postStockAdjustment(adjustment).catch((err) => console.error('[ledger] stock adjustment posting failed:', err))

  return NextResponse.json({ product: updated })
}

/** Recent adjustment history for a product. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const adjustments = await prisma.stockAdjustment.findMany({
    where: { productId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({
    adjustments: adjustments.map((a) => ({
      id: a.id,
      type: a.type,
      delta: a.delta,
      previousStock: a.previousStock,
      newStock: a.newStock,
      reason: a.reason,
      adminEmail: a.adminEmail,
      at: a.createdAt.toISOString(),
    })),
  })
}
