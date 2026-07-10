import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).nullish(),
  segment: z.enum(['VIP', 'REPEAT', 'NEW']).nullish(),
  loyaltyTier: z.string().max(40).nullish(),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: { createdAt: 'asc' },
    include: { orders: { select: { total: true } } },
  })

  const customers = users.map((u) => {
    const orderCount = u.orders.length
    const ltv = u.orders.reduce((sum, o) => sum + o.total, 0)
    return {
      id: u.id,
      name: u.name ?? u.email,
      email: u.email,
      phone: u.phone,
      segment: u.segment,
      loyaltyTier: u.loyaltyTier,
      since: new Date(u.createdAt).getFullYear(),
      orderCount,
      ltv,
    }
  })

  return NextResponse.json({ customers })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid customer' }, { status: 400 })

  const d = parsed.data
  const existing = await prisma.user.findUnique({ where: { email: d.email } })
  if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      phone: d.phone ?? null,
      segment: d.segment ?? 'NEW',
      loyaltyTier: d.loyaltyTier ?? 'Bronze',
      password: '',
      role: 'USER',
    },
  })

  return NextResponse.json({ id: user.id }, { status: 201 })
}
