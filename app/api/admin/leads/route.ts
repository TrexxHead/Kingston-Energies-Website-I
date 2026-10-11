import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const createQuoteSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  quoteShoppingFor: z.string().max(120).optional(),
  quoteArea: z.string().max(120).optional(),
  quoteTimeframe: z.string().max(120).optional(),
  items: z
    .array(z.object({ name: z.string().min(1).max(160), price: z.number().min(0), qty: z.number().int().min(1).max(999) }))
    .min(1),
})

/** Leads captured via the contact form (app/api/contact/route.ts) — no admin surface existed for these before. */
export async function GET() {
  const denied = await guardAdmin()
  if (denied) return denied

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    include: { convertedOrder: { select: { orderNo: true } } },
  })
  return NextResponse.json({
    leads: leads.map((l) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      message: l.message,
      status: l.status,
      quoteItems: (l.quoteItems as { name: string; price: number; qty: number }[] | null) ?? null,
      quoteShoppingFor: l.quoteShoppingFor,
      quoteInterests: l.quoteInterests,
      quoteArea: l.quoteArea,
      quoteTimeframe: l.quoteTimeframe,
      convertedOrderId: l.convertedOrderId,
      convertedOrderNo: l.convertedOrder?.orderNo ?? null,
      convertedAt: l.convertedAt ? l.convertedAt.toISOString() : null,
      createdAt: l.createdAt.toISOString(),
    })),
  })
}

/** Admin-entered quotation — same funnel as a /contact "request a quote" submission, just typed in directly instead of arriving by email. */
export async function POST(request: Request) {
  const denied = await guardAdmin()
  if (denied) return denied

  const parsed = createQuoteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid quotation' }, { status: 400 })

  const { name, email, phone, quoteShoppingFor, quoteArea, quoteTimeframe, items } = parsed.data
  const itemLines = items.map((i) => `${i.name} × ${i.qty}`).join(', ')

  const lead = await prisma.lead.create({
    data: {
      name,
      email,
      phone: phone ?? null,
      message: `Quotation entered by staff: ${itemLines}`,
      status: 'NEW',
      quoteItems: items,
      quoteShoppingFor: quoteShoppingFor ?? null,
      quoteArea: quoteArea ?? null,
      quoteTimeframe: quoteTimeframe ?? null,
    },
  })

  return NextResponse.json({ id: lead.id }, { status: 201 })
}
