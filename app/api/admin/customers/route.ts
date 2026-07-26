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

  const [users, guestOrders, aliases] = await Promise.all([
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
    // Admin-merged duplicates — an aliased email's orders count toward whichever
    // customer it was merged into instead of showing as a separate profile.
    prisma.customerAlias.findMany({ select: { aliasEmail: true, canonicalEmail: true } }).catch(() => []),
  ])

  const aliasMap = new Map(aliases.map((a) => [a.aliasEmail.toLowerCase(), a.canonicalEmail.toLowerCase()]))
  const resolve = (email: string): string => aliasMap.get(email.toLowerCase()) ?? email.toLowerCase()

  const registeredEmails = new Set(users.map((u) => u.email.toLowerCase()))

  // Group guest orders by their alias-resolved email (skip anyone who later
  // registered with that email — their orders are counted via userId instead).
  const guestMap = new Map<string, { name: string; phone: string | null; ltv: number; count: number; first: Date; last: Date }>()
  for (const o of guestOrders) {
    const email = resolve(o.email as string)
    if (registeredEmails.has(email)) continue // folded into a registered user below
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

  // Aliased guest orders whose canonical email belongs to a registered user
  // fold straight into that user's totals (merge across the registered/guest boundary).
  const foldedIntoUser = new Map<string, { ltv: number; count: number; first: Date; last: Date }>()
  for (const o of guestOrders) {
    const email = resolve(o.email as string)
    if (!registeredEmails.has(email)) continue
    const f = foldedIntoUser.get(email)
    if (f) {
      f.ltv += o.total
      f.count += 1
      if (o.createdAt < f.first) f.first = o.createdAt
      if (o.createdAt > f.last) f.last = o.createdAt
    } else {
      foldedIntoUser.set(email, { ltv: o.total, count: 1, first: o.createdAt, last: o.createdAt })
    }
  }

  const customers = users.map((u) => {
    const folded = foldedIntoUser.get(u.email.toLowerCase())
    const orderCount = u.orders.length + (folded?.count ?? 0)
    const ltv = u.orders.reduce((sum, o) => sum + o.total, 0) + (folded?.ltv ?? 0)
    let lastOrder = u.orders.reduce<Date | null>(
      (latest, o) => (latest === null || o.createdAt > latest ? o.createdAt : latest),
      null
    )
    if (folded && (!lastOrder || folded.last > lastOrder)) lastOrder = folded.last
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
