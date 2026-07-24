import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const schema = z.object({
  category: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  amount: z.number().positive(),
  spentAt: z.string().optional(), // ISO date; defaults to now
})

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a category and a positive amount.' }, { status: 400 })

  const { category, description, amount, spentAt } = parsed.data
  const expense = await prisma.expense.create({
    data: {
      category,
      description: description || null,
      amount,
      spentAt: spentAt ? new Date(spentAt) : new Date(),
    },
  })
  return NextResponse.json({ id: expense.id }, { status: 201 })
}
