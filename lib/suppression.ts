import { prisma } from '@/lib/prisma'
import type { SuppressionReason } from '@prisma/client'

/**
 * Emails that must never receive another marketing send — checked before
 * every campaign goes out. Independent of transactional email (order
 * confirmations, password resets, etc. never check this).
 */
export async function isSuppressed(email: string): Promise<boolean> {
  const row = await prisma.suppression.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } })
  return Boolean(row)
}

/** Filters a recipient list down to emails that are safe to send marketing to. */
export async function filterSuppressed(emails: string[]): Promise<string[]> {
  const rows = await prisma.suppression.findMany({
    where: { email: { in: emails.map((e) => e.toLowerCase()) } },
    select: { email: true },
  })
  const suppressed = new Set(rows.map((r) => r.email))
  return emails.filter((e) => !suppressed.has(e.toLowerCase()))
}

export async function suppress(email: string, reason: SuppressionReason): Promise<void> {
  await prisma.suppression.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), reason },
    update: { reason },
  })
}

export async function unsuppress(email: string): Promise<void> {
  await prisma.suppression.delete({ where: { email: email.toLowerCase() } }).catch(() => {})
}
