import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Next KE-#### order number: one past the highest numeric suffix seen so far.
 * Computed in SQL (not fetched-and-parsed in JS) so this stays a single fast
 * aggregate instead of pulling every order ever placed on every checkout.
 */
export async function nextOrderNo(): Promise<string> {
  const rows = await prisma.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(NULLIF(regexp_replace("orderNo", '\D', '', 'g'), '') AS INTEGER)) AS max FROM "Order"
  `
  const max = rows[0]?.max ?? 1023
  return `KE-${max + 1}`
}

function isOrderNoConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

/**
 * Runs `attempt` with a freshly computed order number, retrying with a new
 * number if two checkouts race for the same one (nextOrderNo() has no lock,
 * so concurrent requests can briefly compute the same value — the DB's
 * `orderNo @unique` constraint is the real guard, this just means a collision
 * recovers automatically instead of failing the customer's checkout).
 */
export async function withOrderNoRetry<T>(attempt: (orderNo: string) => Promise<T>, maxAttempts = 5): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < maxAttempts; i++) {
    const orderNo = await nextOrderNo()
    try {
      return await attempt(orderNo)
    } catch (err) {
      if (!isOrderNoConflict(err)) throw err
      lastErr = err
    }
  }
  throw lastErr
}
