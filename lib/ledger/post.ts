import type { JournalSource, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccounting } from '@/lib/accounting'
import { ACC, CHART, EXPENSE_CATEGORY_ACCOUNT } from './chart'

/** One side of a journal entry, addressed by account code. */
export interface DraftLine {
  code: string
  debit?: number
  credit?: number
  memo?: string
}

export interface DraftEntry {
  date: Date
  memo?: string
  source: JournalSource
  sourceId?: string | null
  createdBy?: string | null
  lines: DraftLine[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Create the chart of accounts if it isn't there yet. Idempotent — safe to call
 * on every posting path, which means the ledger self-heals on a fresh database
 * without a separate setup step.
 */
export async function ensureChartOfAccounts(): Promise<void> {
  const count = await prisma.ledgerAccount.count()
  if (count > 0) return
  await prisma.ledgerAccount.createMany({
    data: CHART.map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      subtype: a.subtype ?? null,
      isBank: a.isBank ?? false,
      isSystem: a.system ?? false,
    })),
    skipDuplicates: true,
  })
}

/** Next sequential journal entry number, JE-000001. */
async function nextEntryNo(tx: Prisma.TransactionClient): Promise<string> {
  const last = await tx.journalEntry.findFirst({ orderBy: { entryNo: 'desc' }, select: { entryNo: true } })
  const n = last ? Number.parseInt(last.entryNo.replace(/\D/g, ''), 10) : 0
  return `JE-${String((Number.isFinite(n) ? n : 0) + 1).padStart(6, '0')}`
}

/**
 * Post a balanced entry to the ledger.
 *
 * Refuses to post an unbalanced entry — that's the single invariant the whole
 * system rests on. Returns null (rather than throwing) when this exact source
 * row has already been posted, so callers can fire-and-forget without risking
 * duplicate revenue.
 */
export async function postEntry(draft: DraftEntry): Promise<{ id: string; entryNo: string } | null> {
  const lines = draft.lines
    .map((l) => ({ ...l, debit: round2(l.debit ?? 0), credit: round2(l.credit ?? 0) }))
    .filter((l) => l.debit !== 0 || l.credit !== 0)
  if (lines.length === 0) return null

  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0))
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0))
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Unbalanced journal entry: debits ${totalDebit} ≠ credits ${totalCredit}`)
  }

  await ensureChartOfAccounts()

  const codes = Array.from(new Set(lines.map((l) => l.code)))
  const accounts = await prisma.ledgerAccount.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } })
  const idByCode = new Map(accounts.map((a) => [a.code, a.id]))
  const missing = codes.filter((c) => !idByCode.has(c))
  if (missing.length) throw new Error(`Unknown ledger account code(s): ${missing.join(', ')}`)

  try {
    return await prisma.$transaction(async (tx) => {
      // Idempotency: one entry per (source, sourceId) pair.
      if (draft.sourceId) {
        const existing = await tx.journalEntry.findFirst({
          where: { source: draft.source, sourceId: draft.sourceId },
          select: { id: true, entryNo: true },
        })
        if (existing) return null
      }
      const entry = await tx.journalEntry.create({
        data: {
          entryNo: await nextEntryNo(tx),
          date: draft.date,
          memo: draft.memo ?? null,
          source: draft.source,
          sourceId: draft.sourceId ?? null,
          createdBy: draft.createdBy ?? null,
          lines: {
            create: lines.map((l) => ({
              accountId: idByCode.get(l.code) as string,
              debit: l.debit,
              credit: l.credit,
              memo: l.memo ?? null,
            })),
          },
        },
        select: { id: true, entryNo: true },
      })
      return entry
    })
  } catch (err) {
    // A unique-constraint race on (source, sourceId) means someone else posted
    // it first — that's success from the caller's point of view, not an error.
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') return null
    throw err
  }
}

// ---------------------------------------------------------------------------
// Event → journal translations
// ---------------------------------------------------------------------------

interface OrderLike {
  id: string
  orderNo: string
  customerName: string
  total: number
  createdAt: Date
  items: { name: string; qty: number; price: number }[]
}

/**
 * Revenue recognition for a placed order.
 *
 *   Dr Accounts receivable   (gross)
 *     Cr Product sales       (net of GCT)
 *     Cr Delivery income     (net of GCT)
 *     Cr GCT payable         (tax portion)
 *
 * Negative line items (rewards redemption) are posted as contra revenue rather
 * than netted off sales, so discounting stays visible in the P&L.
 */
export async function postOrderRevenue(order: OrderLike): Promise<void> {
  const accounting = await getAccounting()
  const rate = accounting.gctRate / 100

  let productGross = 0
  let deliveryGross = 0
  let discountGross = 0
  for (const it of order.items) {
    const amount = it.price * it.qty
    if (amount < 0) discountGross += -amount
    else if (it.name.startsWith('Delivery — ')) deliveryGross += amount
    else productGross += amount
  }

  // Back GCT out of tax-inclusive prices, else add it on top.
  const net = (gross: number) => (accounting.gctInclusive ? gross / (1 + rate) : gross)
  const productNet = net(productGross)
  const deliveryNet = net(deliveryGross)
  const discountNet = net(discountGross)
  const gct = round2(productNet * rate + deliveryNet * rate - discountNet * rate)

  await postEntry({
    date: order.createdAt,
    source: 'ORDER',
    sourceId: order.id,
    memo: `Order ${order.orderNo} — ${order.customerName}`,
    lines: [
      { code: ACC.RECEIVABLES, debit: order.total, memo: `Order ${order.orderNo}` },
      { code: ACC.SALES, credit: productNet },
      { code: ACC.DELIVERY_INCOME, credit: deliveryNet },
      { code: ACC.DISCOUNTS, debit: discountNet, memo: 'Rewards / promotional discount' },
      { code: ACC.GCT_PAYABLE, credit: gct },
    ],
  })
}

/**
 * Cost of sales for a placed order — only for units with a known unit cost, so
 * we never invent a cost figure. Relieves inventory at the same time.
 *
 *   Dr Cost of goods sold
 *     Cr Inventory
 */
export async function postOrderCogs(order: OrderLike): Promise<void> {
  const products = await prisma.product.findMany({ where: { cost: { not: null } }, select: { name: true, cost: true } })
  const costByName = new Map(products.map((p) => [p.name.toLowerCase(), p.cost as number]))

  let cogs = 0
  for (const it of order.items) {
    const unit = costByName.get(it.name.toLowerCase())
    if (unit != null) cogs += unit * it.qty
  }
  if (cogs <= 0) return

  await postEntry({
    date: order.createdAt,
    source: 'COGS',
    sourceId: order.id,
    memo: `Cost of sales — order ${order.orderNo}`,
    lines: [
      { code: ACC.COGS, debit: cogs },
      { code: ACC.INVENTORY, credit: cogs },
    ],
  })
}

/**
 * Cash received against a receivable.
 *
 *   Dr Cash / Bank
 *     Cr Accounts receivable
 */
export async function postOrderPayment(order: { id: string; orderNo: string; total: number; paymentMethod: string | null }, receivedAt: Date): Promise<void> {
  // Cash on delivery lands in the cash drawer; everything else in the bank.
  const cashAccount = order.paymentMethod === 'cod' ? ACC.CASH : ACC.BANK
  await postEntry({
    date: receivedAt,
    source: 'PAYMENT',
    sourceId: order.id,
    memo: `Payment received — order ${order.orderNo}`,
    lines: [
      { code: cashAccount, debit: order.total },
      { code: ACC.RECEIVABLES, credit: order.total },
    ],
  })
}

/**
 * A logged operating expense.
 *
 *   Dr <expense category account>
 *     Cr Bank
 */
export async function postExpense(expense: { id: string; category: string; description: string | null; amount: number; spentAt: Date }): Promise<void> {
  const code = EXPENSE_CATEGORY_ACCOUNT[expense.category] ?? '6900'
  await postEntry({
    date: expense.spentAt,
    source: 'EXPENSE',
    sourceId: expense.id,
    memo: expense.description || expense.category,
    lines: [
      { code, debit: expense.amount },
      { code: ACC.BANK, credit: expense.amount },
    ],
  })
}

/**
 * A manual stock correction, valued at the product's unit cost.
 *
 * Increases:  Dr Inventory / Cr Shrinkage  (a find — reduces prior write-offs)
 * Decreases:  Dr Shrinkage / Cr Inventory  (a loss)
 *
 * Deliberately never touches a revenue account: correcting stock is not a sale,
 * which is why adjustments can't move revenue, sales or profit.
 */
export async function postStockAdjustment(adj: {
  id: string
  productId: string
  delta: number
  reason: string | null
  createdAt: Date
  adminEmail: string | null
}): Promise<void> {
  if (adj.delta === 0) return
  const product = await prisma.product.findUnique({ where: { id: adj.productId }, select: { name: true, cost: true } })
  // Without a unit cost there's no defensible value to post — skip rather than guess.
  if (!product?.cost) return

  const value = round2(Math.abs(adj.delta) * product.cost)
  const increase = adj.delta > 0

  await postEntry({
    date: adj.createdAt,
    source: 'STOCK_ADJUSTMENT',
    sourceId: adj.id,
    createdBy: adj.adminEmail,
    memo: `Stock ${increase ? 'increase' : 'decrease'} — ${product.name}${adj.reason ? ` (${adj.reason})` : ''}`,
    lines: increase
      ? [
          { code: ACC.INVENTORY, debit: value },
          { code: ACC.INVENTORY_SHRINKAGE, credit: value },
        ]
      : [
          { code: ACC.INVENTORY_SHRINKAGE, debit: value },
          { code: ACC.INVENTORY, credit: value },
        ],
  })
}

/** Reverse an entry by posting its mirror image. Never deletes — audit trails are append-only. */
export async function reverseEntry(entryId: string, createdBy?: string | null): Promise<void> {
  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: { include: { account: { select: { code: true } } } } },
  })
  if (!entry || entry.reversedById) return

  const reversal = await postEntry({
    date: new Date(),
    source: 'MANUAL',
    memo: `Reversal of ${entry.entryNo}${entry.memo ? ` — ${entry.memo}` : ''}`,
    createdBy,
    lines: entry.lines.map((l) => ({ code: l.account.code, debit: l.credit, credit: l.debit })),
  })
  if (reversal) {
    await prisma.journalEntry.update({ where: { id: entryId }, data: { reversedById: reversal.id } })
  }
}

/**
 * An approved payroll run.
 *
 *   Dr Salaries                          (gross)
 *   Dr Employer statutory contributions  (NIS + NHT + Ed Tax + HEART, employer side)
 *     Cr PAYE payable                    (withheld)
 *     Cr NIS payable                     (employee + employer)
 *     Cr NHT payable                     (employee + employer)
 *     Cr Education tax payable           (employee + employer)
 *     Cr HEART payable                   (employer only)
 *     Cr Accounts payable                (other deductions withheld for third parties)
 *     Cr Net pay payable                 (what the staff are actually owed)
 *
 * Nothing here moves cash. Approval recognises the cost and the obligations;
 * paying the staff and remitting to TAJ are separate events, so the ledger
 * shows what is owed even before it leaves the bank.
 */
export async function postPayrollRun(run: {
  id: string
  runNo: string
  payDate: Date
  payslips: {
    gross: number
    paye: number
    nisEmployee: number
    nhtEmployee: number
    edTaxEmployee: number
    otherDeductions: number
    net: number
    nisEmployer: number
    nhtEmployer: number
    edTaxEmployer: number
    heartEmployer: number
  }[]
}, createdBy?: string | null): Promise<{ id: string; entryNo: string } | null> {
  const sum = (pick: (p: (typeof run.payslips)[number]) => number) => round2(run.payslips.reduce((t, p) => t + pick(p), 0))

  const gross = sum((p) => p.gross)
  const paye = sum((p) => p.paye)
  const nisEmployee = sum((p) => p.nisEmployee)
  const nhtEmployee = sum((p) => p.nhtEmployee)
  const edTaxEmployee = sum((p) => p.edTaxEmployee)
  const other = sum((p) => p.otherDeductions)
  const net = sum((p) => p.net)
  const nisEmployer = sum((p) => p.nisEmployer)
  const nhtEmployer = sum((p) => p.nhtEmployer)
  const edTaxEmployer = sum((p) => p.edTaxEmployer)
  const heartEmployer = sum((p) => p.heartEmployer)
  const employerContributions = round2(nisEmployer + nhtEmployer + edTaxEmployer + heartEmployer)

  return postEntry({
    date: run.payDate,
    source: 'PAYROLL',
    sourceId: run.id,
    createdBy,
    memo: `Payroll ${run.runNo} — ${run.payslips.length} employee${run.payslips.length === 1 ? '' : 's'}`,
    lines: [
      { code: ACC.SALARIES, debit: gross, memo: 'Gross wages' },
      { code: ACC.EMPLOYER_CONTRIBUTIONS, debit: employerContributions, memo: 'Employer statutory contributions' },
      { code: ACC.PAYE_PAYABLE, credit: paye },
      { code: ACC.NIS_PAYABLE, credit: round2(nisEmployee + nisEmployer) },
      { code: ACC.NHT_PAYABLE, credit: round2(nhtEmployee + nhtEmployer) },
      { code: ACC.EDTAX_PAYABLE, credit: round2(edTaxEmployee + edTaxEmployer) },
      { code: ACC.HEART_PAYABLE, credit: heartEmployer },
      { code: ACC.PAYABLES, credit: other, memo: 'Other deductions withheld' },
      { code: ACC.NET_PAY_PAYABLE, credit: net, memo: 'Net pay owed to staff' },
    ],
  })
}

/**
 * Staff actually paid.
 *
 *   Dr Net pay payable
 *     Cr Bank
 *
 * Payments are made outside this system, so this records the settlement rather
 * than initiating it. Statutory remittances to TAJ are logged separately as
 * expenses against the relevant payable.
 */
export async function postPayrollPayment(run: { id: string; runNo: string; net: number }, paidAt: Date, createdBy?: string | null) {
  return postEntry({
    date: paidAt,
    source: 'PAYMENT',
    sourceId: `payroll:${run.id}`,
    createdBy,
    memo: `Net pay disbursed — payroll ${run.runNo}`,
    lines: [
      { code: ACC.NET_PAY_PAYABLE, debit: run.net },
      { code: ACC.BANK, credit: run.net },
    ],
  })
}
