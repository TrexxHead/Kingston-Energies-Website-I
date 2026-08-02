import { prisma } from '@/lib/prisma'
import { countsTowardCustomerHistory } from '@/lib/customerHistory'

/**
 * A segment's saved filter shape (Segment.criteria in the DB). Deliberately a
 * flat, all-AND'd set of optional fields rather than an arbitrary nested
 * AND/OR tree — covers the customer data this site actually has, without a
 * condition-builder UI heavy enough to need its own documentation.
 */
export interface SegmentCriteria {
  tiers?: string[] // CustomerSegment values: VIP | REPEAT | NEW
  needs?: string[] // CustomerNeed values: EVERYDAY | BACKUP | OFFGRID | BUSINESS
  minTotalSpent?: number
  minOrders?: number
  signedUpAfter?: string // ISO date
  signedUpBefore?: string // ISO date
  lastPurchaseWithinDays?: number
  neverPurchased?: boolean
}

export interface SegmentMember {
  id: string
  email: string
  name: string | null
}

interface CustomerRow {
  id: string
  email: string
  name: string | null
  segment: string | null
  primaryNeed: string | null
  createdAt: Date
  orders: { status: string; total: number; paymentMethod: string | null; paid: boolean; createdAt: Date }[]
}

function computeMetrics(user: CustomerRow) {
  const counted = user.orders.filter((o) => o.status !== 'CANCELLED' && countsTowardCustomerHistory(o))
  const totalSpent = counted.reduce((s, o) => s + o.total, 0)
  const orderCount = counted.length
  const lastPurchase = counted.length ? new Date(Math.max(...counted.map((o) => o.createdAt.getTime()))) : null
  return { totalSpent, orderCount, lastPurchase }
}

function matches(user: CustomerRow, criteria: SegmentCriteria): boolean {
  const { totalSpent, orderCount, lastPurchase } = computeMetrics(user)

  if (criteria.tiers?.length && !(user.segment && criteria.tiers.includes(user.segment))) return false
  if (criteria.needs?.length && !(user.primaryNeed && criteria.needs.includes(user.primaryNeed))) return false
  if (criteria.minTotalSpent != null && totalSpent < criteria.minTotalSpent) return false
  if (criteria.minOrders != null && orderCount < criteria.minOrders) return false
  if (criteria.signedUpAfter && user.createdAt < new Date(criteria.signedUpAfter)) return false
  if (criteria.signedUpBefore && user.createdAt > new Date(criteria.signedUpBefore)) return false
  if (criteria.neverPurchased && orderCount > 0) return false
  if (criteria.lastPurchaseWithinDays != null) {
    if (!lastPurchase) return false
    const days = (Date.now() - lastPurchase.getTime()) / 86_400_000
    if (days > criteria.lastPurchaseWithinDays) return false
  }
  return true
}

async function loadCustomers(): Promise<CustomerRow[]> {
  return prisma.user.findMany({
    where: { role: 'USER' },
    select: {
      id: true,
      email: true,
      name: true,
      segment: true,
      primaryNeed: true,
      createdAt: true,
      orders: { select: { status: true, total: true, paymentMethod: true, paid: true, createdAt: true } },
    },
  })
}

/** Every customer currently matching a segment's criteria — used both for the audience-size preview and as the actual send list. */
export async function segmentMembers(criteria: SegmentCriteria): Promise<SegmentMember[]> {
  const customers = await loadCustomers()
  return customers.filter((c) => matches(c, criteria)).map((c) => ({ id: c.id, email: c.email, name: c.name }))
}

export async function segmentSize(criteria: SegmentCriteria): Promise<number> {
  return (await segmentMembers(criteria)).length
}
