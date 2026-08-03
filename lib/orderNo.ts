import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Next KE-#### order number: one past the highest numeric suffix seen so far.
 * Computed in SQL (not fetched-and-parsed in JS) so this stays a single fast
 * aggregate instead of pulling every order ever placed on every checkout.
 */
export async function nextOrderNo(): Promise<string> {
  // A bracket expression ('[^0-9]'), not the \D shorthand: Prisma's $queryRaw
  // tag uses the *cooked* template string, and JS silently drops a backslash
  // in front of a character with no special meaning in a normal string — so
  // '\D' here was actually being sent to Postgres as plain 'D', matching the
  // literal letter rather than "non-digit". That's a real bug this project
  // shipped with: it made regexp_replace a no-op on every "KE-####" order
  // number (none contain the letter D), so the CAST below failed on every
  // existing row and broke every checkout the moment the table had one row
  // in it. Verified with `node -e "console.log(\`\D\`)"` -> "D".
  const rows = await prisma.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(NULLIF(regexp_replace("orderNo", '[^0-9]', '', 'g'), '') AS INTEGER)) AS max FROM "Order"
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
