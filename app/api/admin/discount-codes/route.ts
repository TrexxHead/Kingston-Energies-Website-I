import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'
import { broadcastNotification } from '@/lib/notify'

const createSchema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().positive(),
  minSpend: z.number().nonnegative().nullish(),
  expiresAt: z.string().nullish(), // ISO date
  description: z.string().max(160).nullish(),
  announce: z.boolean().optional(), // notify all customers on creation
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const codes = await prisma.discountCode.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    codes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.value,
      minSpend: c.minSpend,
      active: c.active,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : null,
      description: c.description,
    })),
  })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Provide a code, type and positive value.' }, { status: 400 })

  const d = parsed.data
  if (d.type === 'PERCENT' && d.value > 100) return NextResponse.json({ error: 'Percent must be 0–100.' }, { status: 400 })

  try {
    const code = await prisma.discountCode.create({
      data: {
        code: d.code.trim().toUpperCase(),
        type: d.type,
        value: d.value,
        minSpend: d.minSpend ?? null,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        description: d.description ?? null,
      },
    })
    // Optionally tell every customer about the new code.
    if (d.announce) {
      const off = d.type === 'PERCENT' ? `${d.value}% off` : `J$${d.value.toLocaleString()} off`
      void broadcastNotification('DISCOUNT', `New discount: ${off}`, {
        body: `${d.description ? d.description + ' ' : ''}Use code ${code.code} at checkout.${d.minSpend ? ` Min spend J$${d.minSpend.toLocaleString()}.` : ''}`,
        href: '/shop',
      })
    }
    return NextResponse.json({ id: code.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'That code already exists.' }, { status: 409 })
  }
}
