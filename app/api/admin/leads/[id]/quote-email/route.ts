import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { buildQuoteHtml, type QuoteData } from '@/lib/quoteDocument'
import { sendBulkEmail } from '@/lib/email'
import { logActivity } from '@/lib/activityLog'

function quoteDataForLead(lead: {
  name: string
  email: string
  phone: string | null
  createdAt: Date
  quoteItems: unknown
  quoteShoppingFor: string | null
  quoteArea: string | null
  quoteTimeframe: string | null
}): QuoteData {
  const items = (lead.quoteItems as { name: string; price: number; qty: number }[] | null) ?? []
  return {
    customerName: lead.name,
    email: lead.email,
    phone: lead.phone,
    date: new Date(lead.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    shoppingFor: lead.quoteShoppingFor,
    area: lead.quoteArea,
    timeframe: lead.quoteTimeframe,
    items,
    total: items.reduce((sum, i) => sum + i.price * i.qty, 0),
  }
}

/** View the quotation as a printable HTML page. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied

  const { id } = await params
  const lead = await prisma.lead.findUnique({ where: { id } })
  if (!lead) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  return new Response(buildQuoteHtml(quoteDataForLead(lead)), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

const sendSchema = z.object({ ccEmails: z.array(z.string().email()).max(10).optional() })

/** Email the quotation to the customer (and any extra recipients). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const { id } = await params

  const lead = await prisma.lead.findUnique({ where: { id } })
  if (!lead) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  const parsed = sendSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid recipients' }, { status: 400 })

  const ccEmails = parsed.data.ccEmails ?? lead.quoteCcEmails
  const recipients = [lead.email, ...ccEmails].filter((e, i, arr) => arr.indexOf(e) === i)

  const html = buildQuoteHtml(quoteDataForLead(lead))
  const sent = await sendBulkEmail(recipients, `Your quotation from Kingston Energies`, html)

  if (parsed.data.ccEmails) {
    await prisma.lead.update({ where: { id }, data: { quoteCcEmails: parsed.data.ccEmails } })
  }

  logActivity({
    label: `Quotation emailed to ${lead.name}`,
    detail: `Sent to ${sent} of ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}: ${recipients.join(', ')}`,
    entity: 'lead',
    entityId: lead.id,
    actorEmail: session.user?.email ?? null,
  })

  return NextResponse.json({ sent, of: recipients.length })
}
