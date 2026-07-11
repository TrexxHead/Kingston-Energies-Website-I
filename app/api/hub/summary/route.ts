import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import { co2SavedKg } from '@/lib/impact'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ itemsPurchased: 0, co2Kg: 0 })
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id, status: { not: 'CANCELLED' } },
    include: { items: true },
  })
  const itemsPurchased = orders.reduce((sum, o) => sum + o.items.reduce((n, i) => n + i.qty, 0), 0)

  return NextResponse.json({ itemsPurchased, co2Kg: co2SavedKg(itemsPurchased) })
}
