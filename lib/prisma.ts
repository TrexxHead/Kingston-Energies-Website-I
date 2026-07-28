import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * True when a query failed because its table or column doesn't exist yet —
 * i.e. the code shipped before `prisma db push` ran against this database,
 * not a real bug. P2021 = missing table, P2022 = missing column.
 *
 * A route that queries a brand-new model should catch this and answer
 * gracefully (empty state, clear message) rather than 500 with a stack
 * trace — the fix is running the migration, not changing the code, and the
 * moment someone does, the same code starts working with no further change.
 */
export function isMissingSchemaError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')
}
