import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

/**
 * Executive "Needs attention" feed — a live roll-up of everything outstanding
 * across the shop, so the owner can open the dashboard and see what needs doing
 * without hunting through tabs. Each alert carries a `tab` so the UI can jump
 * straight to where the work happens. Fails soft: any query that errors (e.g.
 * DB briefly unavailable) is skipped rather than blanking the whole feed.
 */

type Tone = 'red' | 'orange' | 'blue' | 'green'
type Tab = 'orders' | 'inventory' | 'customers'

interface Alert {
  key: string
  tone: Tone
  title: string
  count: number
  tab: Tab
  items: string[] // a few concrete examples, most-relevant first
}

const fmt = (n: number) => 'J$' + Math.round(n).toLocaleString()
const channelTag = (source: string) =>
  source === 'WHATSAPP' ? ' · via WhatsApp' : source === 'INSTAGRAM' ? ' · via Instagram' : ''

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const alerts: Alert[] = []

  // Run the reads in parallel; each is individually guarded so one failure
  // doesn't sink the rest.
  const [pending, out, allProducts, tickets, openPOs, detractors] = await Promise.all([
    safe(() => prisma.order.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 5 })),
    safe(() => prisma.order.findMany({ where: { status: 'OUT' }, orderBy: { updatedAt: 'asc' }, take: 5 })),
    safe(() => prisma.product.findMany({ where: { archived: false } })),
    safe(() =>
      prisma.supportTicket.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'asc' },
        take: 5,
      }),
    ),
    safe(() =>
      prisma.purchaseOrder.findMany({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'asc' },
        include: { supplier: true },
        take: 5,
      }),
    ),
    safe(() =>
      prisma.npsResponse.findMany({
        where: { score: { lte: 6 }, createdAt: { gte: daysAgo(30) } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ),
  ])

  // Catalog is small — filter low/out-of-stock in memory (avoids a fragile
  // column-to-column comparison in SQL).
  const lowStockRows = allProducts
    .filter((p) => p.stock <= p.threshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6)

  if (pending.length) {
    alerts.push({
      key: 'orders_pending',
      tone: 'red',
      title: pending.length === 1 ? 'New order to pack' : 'New orders to pack',
      count: pending.length,
      tab: 'orders',
      items: pending.map((o) => `${o.orderNo} · ${o.customerName}${channelTag(o.source)} · ${fmt(o.total)}`),
    })
  }

  if (out.length) {
    alerts.push({
      key: 'orders_out',
      tone: 'orange',
      title: 'Out for delivery',
      count: out.length,
      tab: 'orders',
      items: out.map((o) => `${o.orderNo} · ${o.customerName}`),
    })
  }

  if (lowStockRows.length) {
    const outOfStock = lowStockRows.filter((p) => p.stock === 0).length
    alerts.push({
      key: 'low_stock',
      tone: outOfStock ? 'red' : 'orange',
      title: outOfStock ? 'Out of / low on stock' : 'Low on stock',
      count: lowStockRows.length,
      tab: 'inventory',
      items: lowStockRows.map((p) => `${p.name} · ${p.stock === 0 ? 'OUT OF STOCK' : `${p.stock} left`}`),
    })
  }

  if (tickets.length) {
    alerts.push({
      key: 'tickets',
      tone: 'red',
      title: tickets.length === 1 ? 'Open support ticket' : 'Open support tickets',
      count: tickets.length,
      tab: 'customers',
      items: tickets.map((t) => `${t.customerName} · ${t.subject}`),
    })
  }

  if (openPOs.length) {
    alerts.push({
      key: 'po_open',
      tone: 'blue',
      title: 'Incoming deliveries (open POs)',
      count: openPOs.length,
      tab: 'inventory',
      items: openPOs.map((po) => `${po.reference} · ${po.supplier?.name ?? 'supplier'}${po.amount ? ` · ${fmt(po.amount)}` : ''}`),
    })
  }

  if (detractors.length) {
    alerts.push({
      key: 'nps_detractors',
      tone: 'orange',
      title: 'Unhappy customers to follow up',
      count: detractors.length,
      tab: 'customers',
      items: detractors.map((n) => `Score ${n.score}/10${n.comment ? ` · "${n.comment.slice(0, 48)}${n.comment.length > 48 ? '…' : ''}"` : ''}`),
    })
  }

  const totalOutstanding = alerts.reduce((sum, a) => sum + a.count, 0)

  return NextResponse.json({ alerts, totalOutstanding })
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn()
  } catch {
    return []
  }
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
