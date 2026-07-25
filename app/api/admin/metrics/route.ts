import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

/** Real-time executive metrics computed from live data. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const start14 = new Date(now)
  start14.setDate(now.getDate() - 13)
  start14.setHours(0, 0, 0, 0)

  // Abandoned = active carts with items untouched for 60+ minutes.
  const abandonThreshold = new Date(now.getTime() - 60 * 60 * 1000)

  // Cart analytics live in a newer table — guard so a not-yet-migrated DB can't
  // 500 the whole dashboard.
  let convertedCarts = 0
  let abandonedCarts = 0
  let abandonedValue = 0
  try {
    const [cc, ac, av] = await Promise.all([
      prisma.cart.count({ where: { status: 'CONVERTED' } }),
      prisma.cart.count({ where: { status: 'ACTIVE', itemCount: { gt: 0 }, updatedAt: { lt: abandonThreshold } } }),
      prisma.cart.aggregate({ _sum: { total: true }, where: { status: 'ACTIVE', itemCount: { gt: 0 }, updatedAt: { lt: abandonThreshold } } }),
    ])
    convertedCarts = cc
    abandonedCarts = ac
    abandonedValue = Math.round(av._sum.total ?? 0)
  } catch {
    // Cart table not present yet — leave analytics at zero.
  }

  const [orders, products, userCount, newUsers, recentReviews, reviewAgg, openTickets, campaignAgg] = await Promise.all([
    prisma.order.findMany({
      select: { total: true, status: true, paid: true, userId: true, createdAt: true, items: { select: { name: true, qty: true, price: true } } },
    }),
    prisma.product.findMany({ where: { archived: false }, select: { name: true, stock: true, threshold: true, price: true } }),
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.user.count({ where: { role: 'USER', createdAt: { gte: startOfMonth } } }),
    prisma.review.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { author: true, rating: true, body: true, createdAt: true } }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    prisma.supportTicket.count({ where: { status: { not: 'RESOLVED' } } }).catch(() => 0),
    prisma.campaign.aggregate({ _count: { _all: true }, _sum: { recipientCount: true }, where: { status: 'SENT' } }).catch(() => ({ _count: { _all: 0 }, _sum: { recipientCount: 0 } })),
  ])

  // Conversion rate = converted carts / (converted + abandoned).
  const conversionDenom = convertedCarts + abandonedCarts
  const conversionRate = conversionDenom ? Math.round((convertedCarts / conversionDenom) * 100) : null

  const valid = orders.filter((o) => o.status !== 'CANCELLED')
  const revenue = valid.reduce((s, o) => s + o.total, 0)
  const orderCount = valid.length
  const aov = orderCount ? Math.round(revenue / orderCount) : 0

  // Repeat-customer rate.
  const byCustomer = new Map<string, number>()
  for (const o of valid) if (o.userId) byCustomer.set(o.userId, (byCustomer.get(o.userId) ?? 0) + 1)
  const customersWithOrders = byCustomer.size
  const repeatCustomers = [...byCustomer.values()].filter((n) => n > 1).length
  const repeatRate = customersWithOrders ? Math.round((repeatCustomers / customersWithOrders) * 100) : 0

  // Operational counts.
  const pendingDeliveries = valid.filter((o) => o.status !== 'DONE').length
  const unpaid = valid.filter((o) => !o.paid).length
  const monthRevenue = valid.filter((o) => new Date(o.createdAt) >= startOfMonth).reduce((s, o) => s + o.total, 0)

  // Revenue for the last 14 days (daily buckets).
  const buckets: { label: string; value: number }[] = []
  for (let i = 0; i < 14; i++) {
    const day = new Date(start14)
    day.setDate(start14.getDate() + i)
    const next = new Date(day)
    next.setDate(day.getDate() + 1)
    const total = valid
      .filter((o) => new Date(o.createdAt) >= day && new Date(o.createdAt) < next)
      .reduce((s, o) => s + o.total, 0)
    buckets.push({ label: day.toLocaleDateString('en-GB', { day: 'numeric' }), value: total })
  }

  // Best sellers by units sold.
  const unitsByName = new Map<string, number>()
  for (const o of valid) for (const it of o.items) unitsByName.set(it.name, (unitsByName.get(it.name) ?? 0) + it.qty)
  const bestSellers = [...unitsByName.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, units]) => ({ name, units }))

  // Low stock.
  const lowStock = products
    .filter((p) => p.stock <= p.threshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6)
    .map((p) => ({ name: p.name, stock: p.stock, out: p.stock === 0 }))

  const inventoryValue = products.reduce((s, p) => s + p.price * p.stock, 0)

  return NextResponse.json({
    kpis: {
      revenue,
      monthRevenue,
      orders: orderCount,
      aov,
      customers: userCount,
      newCustomers: newUsers,
      repeatRate,
      pendingDeliveries,
      unpaid,
      lowStockCount: lowStock.length,
      avgRating: reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : null,
      reviewCount: reviewAgg._count._all,
      inventoryValue: Math.round(inventoryValue),
      abandonedCarts,
      abandonedValue,
      conversionRate,
      openTickets,
      campaignsSent: campaignAgg._count._all,
      campaignReach: campaignAgg._sum.recipientCount ?? 0,
    },
    revenueSeries: buckets,
    bestSellers,
    lowStock,
    customerGrowth: { total: userCount, newThisMonth: newUsers },
    recentReviews: recentReviews.map((r) => ({
      author: r.author || 'Customer',
      rating: r.rating,
      body: r.body,
      at: r.createdAt.toISOString(),
    })),
  })
}
