import { prisma } from '@/lib/prisma'

/**
 * The business feed.
 *
 * Assembled from events that actually happened — orders, payments, expenses,
 * stock movements, payroll, journal entries, imported bank lines — rather than
 * from a notifications table someone has to remember to write to. That means
 * the feed cannot drift out of sync with the records, and nothing appears in it
 * that isn't backed by a row you can go and look at.
 */

export type FeedCategory = 'SALES' | 'PAYMENTS' | 'EXPENSES' | 'INVENTORY' | 'PAYROLL' | 'BANKING' | 'ACCOUNTING'

export type FeedPriority = 'ROUTINE' | 'ATTENTION' | 'URGENT'

export interface FeedItem {
  /** Stable across refreshes so pin/snooze state sticks to the right event. */
  id: string
  category: FeedCategory
  priority: FeedPriority
  at: string
  title: string
  detail: string | null
  amount: number | null
  /** Where to go to act on it. */
  href: string | null
  actor: string | null
}

const DAY = 86_400_000

/** How long an unpaid order can sit before it stops being routine. */
const CHASE_AFTER_DAYS = 7
const OVERDUE_AFTER_DAYS = 30

export async function businessFeed(limit = 60): Promise<FeedItem[]> {
  const since = new Date(Date.now() - 90 * DAY)
  const now = Date.now()

  const [orders, expenses, adjustments, runs, bankLines, entries, documents] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { id: true, orderNo: true, customerName: true, total: true, paid: true, status: true, source: true, createdAt: true, proofOfPaymentAt: true },
    }),
    prisma.expense.findMany({ where: { spentAt: { gte: since } }, orderBy: { spentAt: 'desc' }, take: 25 }),
    prisma.stockAdjustment.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { product: { select: { name: true } } },
    }),
    prisma.payrollRun.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 10, include: { payslips: true } }),
    prisma.bankStatementLine.findMany({
      where: { importedAt: { gte: since }, status: 'UNMATCHED' },
      orderBy: { postedAt: 'desc' },
      take: 20,
      include: { connection: { select: { name: true } } },
    }),
    prisma.journalEntry.findMany({ where: { createdAt: { gte: since }, source: 'MANUAL' }, orderBy: { createdAt: 'desc' }, take: 15 }),
    prisma.documentScan.findMany({ where: { createdAt: { gte: since }, status: 'NEEDS_REVIEW' }, orderBy: { createdAt: 'desc' }, take: 15 }),
  ])

  const items: FeedItem[] = []

  for (const o of orders) {
    const ageDays = Math.floor((now - o.createdAt.getTime()) / DAY)
    const cancelled = o.status === 'CANCELLED'

    items.push({
      id: `order:${o.id}`,
      category: 'SALES',
      priority: 'ROUTINE',
      at: o.createdAt.toISOString(),
      title: `${o.orderNo} — ${o.customerName}`,
      detail: `${o.source.toLowerCase().replace('_', ' ')} order${cancelled ? ', cancelled' : ''}`,
      amount: o.total,
      href: '/admin/dashboard/orders',
      actor: null,
    })

    // An unpaid order past the chase threshold is the feed's whole point: it
    // surfaces on age, not on someone remembering to flag it.
    if (!o.paid && !cancelled && ageDays >= CHASE_AFTER_DAYS && o.total > 0) {
      items.push({
        id: `unpaid:${o.id}`,
        category: 'PAYMENTS',
        priority: ageDays >= OVERDUE_AFTER_DAYS ? 'URGENT' : 'ATTENTION',
        at: o.createdAt.toISOString(),
        title: `${o.orderNo} unpaid after ${ageDays} days`,
        detail: `${o.customerName} has not paid. ${o.proofOfPaymentAt ? 'Proof of payment was uploaded — check it.' : 'No proof of payment uploaded.'}`,
        amount: o.total,
        href: '/admin/dashboard/orders',
        actor: null,
      })
    }

    if (o.proofOfPaymentAt && !o.paid && !cancelled) {
      items.push({
        id: `proof:${o.id}`,
        category: 'PAYMENTS',
        priority: 'ATTENTION',
        at: o.proofOfPaymentAt.toISOString(),
        title: `Proof of payment awaiting review — ${o.orderNo}`,
        detail: `${o.customerName} uploaded a receipt. Confirm it and mark the order paid.`,
        amount: o.total,
        href: '/admin/dashboard/orders',
        actor: null,
      })
    }
  }

  for (const e of expenses) {
    items.push({
      id: `expense:${e.id}`,
      category: 'EXPENSES',
      priority: 'ROUTINE',
      at: e.spentAt.toISOString(),
      title: `${e.category} expense`,
      detail: e.description,
      amount: e.amount,
      href: '/admin/dashboard/finance/expenses',
      actor: null,
    })
  }

  for (const a of adjustments) {
    items.push({
      id: `stock:${a.id}`,
      category: 'INVENTORY',
      priority: Math.abs(a.delta) >= 10 ? 'ATTENTION' : 'ROUTINE',
      at: a.createdAt.toISOString(),
      title: `${a.product.name} stock ${a.delta >= 0 ? 'up' : 'down'} ${Math.abs(a.delta)}`,
      detail: a.reason || `${a.previousStock} → ${a.newStock}`,
      amount: null,
      href: '/admin/dashboard/inventory',
      actor: a.adminEmail,
    })
  }

  for (const r of runs) {
    const gross = r.payslips.reduce((s, p) => s + p.gross, 0)
    items.push({
      id: `payroll:${r.id}`,
      category: 'PAYROLL',
      priority: r.status === 'DRAFT' ? 'ATTENTION' : 'ROUTINE',
      at: (r.approvedAt ?? r.createdAt).toISOString(),
      title: `Payroll ${r.runNo} — ${r.status.toLowerCase()}`,
      detail:
        r.status === 'DRAFT'
          ? `${r.payslips.length} payslips calculated, waiting for approval. Confirm the statutory rates first.`
          : `${r.payslips.length} employees`,
      amount: gross,
      href: '/admin/dashboard/finance/payroll',
      actor: r.approvedBy,
    })
  }

  for (const l of bankLines) {
    items.push({
      id: `bankline:${l.id}`,
      category: 'BANKING',
      priority: 'ATTENTION',
      at: l.postedAt.toISOString(),
      title: `Unreviewed bank line — ${l.description.slice(0, 60)}`,
      detail: `${l.connection.name}. The bank says this happened; the books have not been told what it was.`,
      amount: l.amount,
      href: '/admin/dashboard/finance/banking',
      actor: null,
    })
  }

  for (const e of entries) {
    items.push({
      id: `journal:${e.id}`,
      category: 'ACCOUNTING',
      priority: 'ROUTINE',
      at: e.date.toISOString(),
      title: `Manual journal ${e.entryNo}`,
      detail: e.memo,
      amount: null,
      href: '/admin/dashboard/finance/accounting',
      actor: e.createdBy,
    })
  }

  for (const d of documents) {
    items.push({
      id: `document:${d.id}`,
      category: 'EXPENSES',
      priority: 'ATTENTION',
      at: d.createdAt.toISOString(),
      title: `Receipt awaiting confirmation — ${d.vendor || d.filename}`,
      detail: 'Confirm the amount and category to raise the expense.',
      amount: d.total,
      href: '/admin/dashboard/finance/receipts',
      actor: d.uploadedBy,
    })
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}
