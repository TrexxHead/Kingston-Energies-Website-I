import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { customerValueTier, monthsSince } from '@/lib/crm'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).nullish(),
  segment: z.enum(['VIP', 'REPEAT', 'NEW']).nullish(),
  loyaltyTier: z.string().max(40).nullish(),
})

/** Encode a stable id for a guest customer (grouped by email). */
function guestId(email: string): string {
  return 'guest:' + email.toLowerCase()
}

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const [users, guestOrders] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'USER' },
      orderBy: { createdAt: 'asc' },
      include: {
        orders: { select: { total: true, createdAt: true } },
        tickets: { select: { status: true } },
      },
    }),
    // Guest orders — no linked account but a captured email — become CRM records.
    prisma.order.findMany({
      where: { userId: null, email: { not: null }, status: { not: 'CANCELLED' } },
      select: { email: true, customerName: true, phone: true, total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const registeredEmails = new Set(users.map((u) => u.email.toLowerCase()))

  const customers = users.map((u) => {
    const orderCount = u.orders.length
    const ltv = u.orders.reduce((sum, o) => sum + o.total, 0)
    const lastOrder = u.orders.reduce<Date | null>(
      (latest, o) => (latest === null || o.createdAt > latest ? o.createdAt : latest),
      null
    )
    const openTickets = u.tickets.filter((t) => t.status !== 'RESOLVED').length
    const valueTier = customerValueTier({
      ltv,
      orderCount,
      monthsSinceLastOrder: monthsSince(lastOrder),
      openTickets,
    })
    return {
      id: u.id,
      registered: true,
      name: u.name ?? u.email,
      email: u.email,
      phone: u.phone,
      segment: u.segment,
      loyaltyTier: u.loyaltyTier,
      primaryNeed: u.primaryNeed,
      since: new Date(u.createdAt).getFullYear(),
      orderCount,
      ltv,
      valueTier,
    }
  })

  // Group guest orders by email (skip anyone who later registered with that email).
  const guestMap = new Map<string, { name: string; phone: string | null; ltv: number; count: number; first: Date; last: Date }>()
  for (const o of guestOrders) {
    const email = (o.email as string).toLowerCase()
    if (registeredEmails.has(email)) continue
    const g = guestMap.get(email)
    if (g) {
      g.ltv += o.total
      g.count += 1
      if (o.createdAt < g.first) g.first = o.createdAt
      if (o.createdAt > g.last) g.last = o.createdAt
      if (!g.phone && o.phone) g.phone = o.phone
    } else {
      guestMap.set(email, { name: o.customerName, phone: o.phone, ltv: o.total, count: 1, first: o.createdAt, last: o.createdAt })
    }
  }

  const guests = [...guestMap.entries()].map(([email, g]) => ({
    id: guestId(email),
    registered: false,
    name: g.name || email,
    email,
    phone: g.phone,
    segment: null,
    loyaltyTier: null,
    primaryNeed: null,
    since: g.first.getFullYear(),
    orderCount: g.count,
    ltv: g.ltv,
    valueTier: customerValueTier({ ltv: g.ltv, orderCount: g.count, monthsSinceLastOrder: monthsSince(g.last), openTickets: 0 }),
  }))

  return NextResponse.json({ customers: [...customers, ...guests] })
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
