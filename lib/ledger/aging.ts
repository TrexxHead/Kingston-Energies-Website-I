import { prisma } from '@/lib/prisma'

/**
 * Receivables and payables, bucketed by age.
 *
 * Aging is the question "who owes us, and for how long" — the buckets are what
 * turn one receivables total into a collections priority. They are built from
 * the operational records (unpaid orders, unsettled payroll and statutory
 * liabilities) rather than a single ledger balance, because a balance can tell
 * you the amount but not the age.
 */

export const BUCKETS = [
  { key: 'current', label: 'Not yet due', from: -Infinity, to: 0 },
  { key: 'd1_30', label: '1–30 days', from: 0, to: 30 },
  { key: 'd31_60', label: '31–60 days', from: 30, to: 60 },
  { key: 'd61_90', label: '61–90 days', from: 60, to: 90 },
  { key: 'd90plus', label: 'Over 90 days', from: 90, to: Infinity },
] as const

export type BucketKey = (typeof BUCKETS)[number]['key']

export interface AgingRow {
  id: string
  reference: string
  party: string
  date: string
  ageDays: number
  amount: number
  bucket: BucketKey
}

export interface AgingReport {
  rows: AgingRow[]
  buckets: { key: BucketKey; label: string; amount: number; count: number }[]
  total: number
  /** Longest-outstanding item, which is usually the one worth a phone call. */
  oldestDays: number
}

const DAY = 86_400_000

/**
 * Payment terms.
 *
 * The business sells on immediate payment rather than credit terms, so an
 * unpaid order is due the day it is placed and its age is simply how long it
 * has been outstanding. If terms are ever introduced this is the one constant
 * to change.
 */
export const DUE_DAYS = 0

function bucketFor(ageDays: number): BucketKey {
  for (const b of BUCKETS) {
    if (ageDays > b.from && ageDays <= b.to) return b.key
  }
  return ageDays <= 0 ? 'current' : 'd90plus'
}

function summarise(rows: AgingRow[]): AgingReport {
  return {
    rows,
    buckets: BUCKETS.map((b) => {
      const inBucket = rows.filter((r) => r.bucket === b.key)
      return {
        key: b.key,
        label: b.label,
        amount: Math.round(inBucket.reduce((s, r) => s + r.amount, 0)),
        count: inBucket.length,
      }
    }),
    total: Math.round(rows.reduce((s, r) => s + r.amount, 0)),
    oldestDays: rows.reduce((m, r) => Math.max(m, r.ageDays), 0),
  }
}

/** Money owed to the business: orders placed but not yet paid. */
export async function receivablesAging(asOf: Date = new Date()): Promise<AgingReport> {
  const orders = await prisma.order.findMany({
    where: { paid: false, status: { notIn: ['CANCELLED'] }, createdAt: { lte: asOf } },
    select: { id: true, orderNo: true, customerName: true, total: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const rows: AgingRow[] = orders
    .filter((o) => o.total > 0)
    .map((o) => {
      const ageDays = Math.floor((asOf.getTime() - o.createdAt.getTime()) / DAY) - DUE_DAYS
      return {
        id: o.id,
        reference: o.orderNo,
        party: o.customerName,
        date: o.createdAt.toISOString(),
        ageDays,
        amount: o.total,
        bucket: bucketFor(ageDays),
      }
    })

  return summarise(rows)
}

/**
 * Money the business owes.
 *
 * Approved payroll that hasn't been paid, and the statutory deductions sitting
 * in the payroll payable accounts, are the real obligations this system knows
 * about. Supplier bills aren't modelled as a separate document yet, so they are
 * not silently invented here — expenses are recorded as already settled.
 */
export async function payablesAging(asOf: Date = new Date()): Promise<AgingReport> {
  const runs = await prisma.payrollRun.findMany({
    where: { status: 'APPROVED', payDate: { lte: asOf } },
    include: { payslips: true },
    orderBy: { payDate: 'asc' },
  })

  const rows: AgingRow[] = []

  for (const run of runs) {
    const ageDays = Math.floor((asOf.getTime() - run.payDate.getTime()) / DAY)
    const net = run.payslips.reduce((s, p) => s + p.net, 0)
    if (net > 0) {
      rows.push({
        id: `${run.id}-net`,
        reference: run.runNo,
        party: 'Staff: net pay',
        date: run.payDate.toISOString(),
        ageDays,
        amount: net,
        bucket: bucketFor(ageDays),
      })
    }

    const statutory = run.payslips.reduce(
      (s, p) => s + p.paye + p.nisEmployee + p.nisEmployer + p.nhtEmployee + p.nhtEmployer + p.edTaxEmployee + p.edTaxEmployer + p.heartEmployer,
      0,
    )
    if (statutory > 0) {
      rows.push({
        id: `${run.id}-statutory`,
        reference: run.runNo,
        party: 'Tax Administration Jamaica: statutory',
        date: run.payDate.toISOString(),
        ageDays,
        amount: statutory,
        bucket: bucketFor(ageDays),
      })
    }
  }

  return summarise(rows)
}
