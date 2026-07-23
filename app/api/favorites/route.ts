import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/authOptions'

/** List the signed-in customer's saved product ids. */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ productIds: [] })

  const rows = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { productId: true },
  })
  return NextResponse.json({ productIds: rows.map((r) => r.productId) })
}

const bodySchema = z.object({ productId: z.string().min(1).max(60) })

/** Toggle a product in the customer's saved list. Returns the new state. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in to save products.' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid product' }, { status: 400 })

  const userId = session.user.id
  const { productId } = parsed.data
  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId, productId } },
  })

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } })
    return NextResponse.json({ favorited: false })
  }
  await prisma.favorite.create({ data: { userId, productId } })
  return NextResponse.json({ favorited: true })
}
