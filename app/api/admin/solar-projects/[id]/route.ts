import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { guardAdmin, requireAdmin } from '@/lib/requireAdmin'
import { quoteSchema, quoteTotals, defaultQuote, stageIndex, STAGES, STAGE_IDS, designSummaryLines, type DesignSnapshot } from '@/lib/solarProjects'
import { sendSolarProjectEmail } from '@/lib/email'

/** GET — one project with its full history and documents (staff view). A starting quote is offered from the design if none exists. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { id } = await params
  const p = await prisma.solarProject.findUnique({ where: { id }, include: { events: { orderBy: { createdAt: 'desc' } }, documents: { orderBy: { createdAt: 'desc' } } } })
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ project: p, suggestedQuote: p.quote ? null : defaultQuote(p.design as unknown as DesignSnapshot, p.exportsToGrid) })
}

const patch = z.object({
  stage: z.enum([...STAGE_IDS, 'cancelled'] as [string, ...string[]]).optional(),
  note: z.string().trim().max(2000).optional(),
  customerVisible: z.boolean().optional(),
  notifyCustomer: z.boolean().optional(),
  staffNote: z.string().max(4000).optional(),
  quote: quoteSchema.optional(),
  sendQuote: z.boolean().optional(),
})

/**
 * PATCH — move the project on (with a note the customer may see), keep staff
 * notes, save the quote draft, or send the quote. A quote can only be sent
 * with every line priced.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin()
  if (denied) return denied
  const session = await requireAdmin()
  const by = session.user?.email ?? 'staff'
  const { id } = await params
  const parsed = patch.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Check the form.' }, { status: 400 })
  const b = parsed.data
  const p = await prisma.solarProject.findUnique({ where: { id } })
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: Prisma.SolarProjectUpdateInput = {}
  const events: Prisma.SolarProjectEventCreateWithoutProjectInput[] = []
  if (b.staffNote !== undefined) data.staffNote = b.staffNote || null
  if (b.quote) {
    data.quote = b.quote as unknown as Prisma.InputJsonValue
    if (p.quoteStatus === 'none' || p.quoteStatus === 'declined') data.quoteStatus = 'draft'
    if (p.quoteStatus === 'sent' && !b.sendQuote) data.quoteStatus = 'draft' // edited after sending: must be re-sent
  }
  let sentQuote = false
  if (b.sendQuote) {
    const q = b.quote ?? (p.quote ? quoteSchema.safeParse(p.quote).data : undefined)
    if (!q) return NextResponse.json({ error: 'Build the quote first.' }, { status: 400 })
    const t = quoteTotals(q)
    if (t.unpriced > 0) return NextResponse.json({ error: `${t.unpriced} line${t.unpriced === 1 ? ' has' : 's have'} no price yet.` }, { status: 400 })
    if (t.total <= 0) return NextResponse.json({ error: 'The quote total is zero.' }, { status: 400 })
    data.quoteStatus = 'sent'
    data.quoteSentAt = new Date()
    if (stageIndex(p.stage) < stageIndex('quote_sent')) data.stage = 'quote_sent'
    events.push({ stage: stageIndex(p.stage) < stageIndex('quote_sent') ? 'quote_sent' : null, note: 'Quotation sent.', createdBy: by })
    sentQuote = true
  }
  if (b.stage && b.stage !== p.stage && !sentQuote) {
    data.stage = b.stage
    events.push({ stage: b.stage, note: b.note || null, customerVisible: b.customerVisible ?? true, createdBy: by })
  } else if (b.note && !b.stage) {
    events.push({ note: b.note, customerVisible: b.customerVisible ?? false, createdBy: by })
  }
  if (events.length) data.events = { create: events }
  const updated = await prisma.solarProject.update({ where: { id }, data })

  const d = p.design as unknown as DesignSnapshot
  if (sentQuote) void sendSolarProjectEmail({ kind: 'quote_sent', projectNo: p.projectNo, customerName: p.customerName, email: p.email, summary: designSummaryLines(d).slice(0, 1) })
  else if (b.stage && b.stage !== p.stage && b.notifyCustomer && b.stage !== 'cancelled') {
    const st = STAGES.find((s) => s.id === b.stage)
    void sendSolarProjectEmail({ kind: 'stage', projectNo: p.projectNo, customerName: p.customerName, email: p.email, summary: [], stageLabel: st?.label, stageText: b.note || st?.customer })
  }
  return NextResponse.json({ project: updated })
}
