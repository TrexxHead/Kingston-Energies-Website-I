import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/requireAdmin'

const patchSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']).optional(),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).nullable().optional(),
  quoteShoppingFor: z.string().max(120).nullable().optional(),
  quoteArea: z.string().max(120).nullable().optional(),
  quoteTimeframe: z.string().max(120).nullable().optional(),
  ccEmails: z.array(z.string().email()).max(10).optional(),
  items: z
    .array(z.object({ name: z.string().min(1).max(160), price: z.number().min(0), qty: z.number().int().min(1).max(999) }))
    .min(1)
    .optional(),
})

/**
 * Covers both the lightweight status-dropdown update (just `status`) and
 * a full quote edit before conversion — editing a quote after it's been
 * converted to an order would desync it from the order it already became,
 * so that's blocked below.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 })

  const { status, name, email, phone, quoteShoppingFor, quoteArea, quoteTimeframe, ccEmails, items } = parsed.data

  const editingQuote = name !== undefined || email !== undefined || phone !== undefined
    || quoteShoppingFor !== undefined || quoteArea !== undefined || quoteTimeframe !== undefined
    || ccEmails !== undefined || items !== undefined

  if (editingQuote) {
    const existing = await prisma.lead.findUnique({ where: { id }, select: { convertedOrderId: true } })
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    if (existing.convertedOrderId) {
      return NextResponse.json({ error: 'This quote has already been converted to an order and can no longer be edited.' }, { status: 409 })
    }
  }

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(quoteShoppingFor !== undefined ? { quoteShoppingFor } : {}),
        ...(quoteArea !== undefined ? { quoteArea } : {}),
        ...(quoteTimeframe !== undefined ? { quoteTimeframe } : {}),
        ...(ccEmails !== undefined ? { quoteCcEmails: ccEmails } : {}),
        ...(items !== undefined ? { quoteItems: items } : {}),
      },
    })
    return NextResponse.json({ lead })
  } catch {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }
}
