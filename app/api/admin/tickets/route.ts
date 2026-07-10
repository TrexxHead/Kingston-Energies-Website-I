import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const createSchema = z.object({
  customerId: z.string().min(1).nullish(),
  customerName: z.string().min(1).max(120),
  subject: z.string().min(1).max(200),
})

export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ tickets })
}

export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid ticket' }, { status: 400 })

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: parsed.data.customerId ?? null,
      customerName: parsed.data.customerName,
      subject: parsed.data.subject,
    },
  })
  return NextResponse.json({ ticket }, { status: 201 })
}
