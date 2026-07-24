import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

// Accepts a map of category -> monthly budget amount and upserts each.
const schema = z.object({
  budgets: z.record(z.string().max(60), z.number().nonnegative()),
})

export async function PUT(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid budgets' }, { status: 400 })

  const entries = Object.entries(parsed.data.budgets)
  await Promise.all(
    entries.map(([category, monthlyAmount]) =>
      monthlyAmount > 0
        ? prisma.budget.upsert({
            where: { category },
            create: { category, monthlyAmount },
            update: { monthlyAmount },
          })
        : prisma.budget.deleteMany({ where: { category } }),
    ),
  )
  return NextResponse.json({ ok: true })
}
