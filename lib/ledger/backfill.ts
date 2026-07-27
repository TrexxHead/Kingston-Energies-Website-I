import { prisma } from '@/lib/prisma'
import { ensureChartOfAccounts, postExpense, postOrderCogs, postOrderPayment, postOrderRevenue, postStockAdjustment } from './post'

export interface BackfillResult {
  accountsCreated: boolean
  orders: number
  payments: number
  cogs: number
  expenses: number
  stockAdjustments: number
  errors: string[]
}

/**
 * Post every historical operational record into the ledger.
 *
 * Safe to run repeatedly: each posting path is keyed on (source, sourceId), so
 * anything already journalled is skipped rather than duplicated. This is what
 * turns an empty ledger into a complete set of books over existing data.
 */
export async function backfillLedger(): Promise<BackfillResult> {
  const before = await prisma.ledgerAccount.count()
  await ensureChartOfAccounts()
  const result: BackfillResult = {
    accountsCreated: before === 0,
    orders: 0,
    payments: 0,
    cogs: 0,
    expenses: 0,
    stockAdjustments: 0,
    errors: [],
  }

  const countEntries = (source: 'ORDER' | 'PAYMENT' | 'COGS' | 'EXPENSE' | 'STOCK_ADJUSTMENT') =>
    prisma.journalEntry.count({ where: { source } })

  const startCounts = {
    order: await countEntries('ORDER'),
    payment: await countEntries('PAYMENT'),
    cogs: await countEntries('COGS'),
    expense: await countEntries('EXPENSE'),
    stock: await countEntries('STOCK_ADJUSTMENT'),
  }

  // ---- Orders: revenue, cost of sales, then any payment received ----
  const orders = await prisma.order.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  })
  for (const o of orders) {
    try {
      await postOrderRevenue(o)
      await postOrderCogs(o)
      if (o.paid) {
        await postOrderPayment(o, o.updatedAt ?? o.createdAt)
      }
    } catch (err) {
      result.errors.push(`Order ${o.orderNo}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  // ---- Logged expenses ----
  const expenses = await prisma.expense.findMany({ orderBy: { spentAt: 'asc' } })
  for (const e of expenses) {
    try {
      await postExpense(e)
    } catch (err) {
      result.errors.push(`Expense ${e.id}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  // ---- Manual stock adjustments ----
  const adjustments = await prisma.stockAdjustment.findMany({ orderBy: { createdAt: 'asc' } }).catch(() => [])
  for (const a of adjustments) {
    try {
      await postStockAdjustment(a)
    } catch (err) {
      result.errors.push(`Stock adjustment ${a.id}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  result.orders = (await countEntries('ORDER')) - startCounts.order
  result.payments = (await countEntries('PAYMENT')) - startCounts.payment
  result.cogs = (await countEntries('COGS')) - startCounts.cogs
  result.expenses = (await countEntries('EXPENSE')) - startCounts.expense
  result.stockAdjustments = (await countEntries('STOCK_ADJUSTMENT')) - startCounts.stock
  return result
}
